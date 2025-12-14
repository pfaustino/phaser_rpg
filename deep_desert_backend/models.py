from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(128), unique=True, nullable=False)
    username = db.Column(db.String(128))
    email = db.Column(db.String(128))
    avatar = db.Column(db.String(256))
    markers = db.relationship('Marker', backref='user', lazy=True)

class Marker(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cell = db.Column(db.String(3), nullable=False)  # e.g. 'A1'
    marker_type = db.Column(db.String(32), nullable=False)  # base, resource, lab, spice, wreck
    note = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) 