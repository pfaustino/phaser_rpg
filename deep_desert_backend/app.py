import os
from flask import Flask, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from authlib.integrations.flask_client import OAuth
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from models import db, User, Marker
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///deep_desert.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app, supports_credentials=True)
db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)

# OAuth setup
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    access_token_url='https://accounts.google.com/o/oauth2/token',
    access_token_params=None,
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    userinfo_endpoint='https://openidconnect.googleapis.com/v1/userinfo',
    client_kwargs={'scope': 'openid email profile'},
)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.before_first_request
def create_tables():
    db.create_all()

@app.route('/api/login')
def login():
    redirect_uri = url_for('authorize', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/api/authorize')
def authorize():
    token = google.authorize_access_token()
    resp = google.get('userinfo')
    user_info = resp.json()
    user = User.query.filter_by(google_id=user_info['sub']).first()
    if not user:
        user = User(
            google_id=user_info['sub'],
            username=user_info.get('name'),
            email=user_info.get('email'),
            avatar=user_info.get('picture')
        )
        db.session.add(user)
        db.session.commit()
    login_user(user)
    return redirect('/')  # Frontend should handle session

@app.route('/api/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'})

@app.route('/api/user')
def get_user():
    if current_user.is_authenticated:
        return jsonify({
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'avatar': current_user.avatar
        })
    return jsonify({'user': None})

@app.route('/api/markers', methods=['GET'])
def get_markers():
    markers = Marker.query.all()
    return jsonify([
        {
            'id': m.id,
            'cell': m.cell,
            'marker_type': m.marker_type,
            'note': m.note,
            'created_at': m.created_at.isoformat(),
            'user': m.user.username if m.user else None
        } for m in markers
    ])

@app.route('/api/markers', methods=['POST'])
@login_required
def add_marker():
    data = request.json
    cell = data.get('cell')
    marker_type = data.get('marker_type')
    note = data.get('note')
    marker = Marker(cell=cell, marker_type=marker_type, note=note, user_id=current_user.id)
    db.session.add(marker)
    db.session.commit()
    return jsonify({'success': True, 'marker_id': marker.id})

@app.route('/api/markers/<int:marker_id>', methods=['PUT'])
@login_required
def edit_marker(marker_id):
    marker = Marker.query.get(marker_id)
    if marker and marker.user_id == current_user.id:
        data = request.json
        marker.cell = data.get('cell', marker.cell)
        marker.marker_type = data.get('marker_type', marker.marker_type)
        marker.note = data.get('note', marker.note)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Not found or unauthorized'}), 403

@app.route('/api/markers/<int:marker_id>', methods=['DELETE'])
@login_required
def delete_marker(marker_id):
    marker = Marker.query.get(marker_id)
    if marker and marker.user_id == current_user.id:
        db.session.delete(marker)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Not found or unauthorized'}), 403

@app.route('/api/reset', methods=['POST'])
def reset_markers():
    # TODO: Add admin check if needed
    Marker.query.delete()
    db.session.commit()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True) 