import json
import sys
import os

def verify_quests():
    try:
        file_path = os.path.join(os.getcwd(), 'quests_v2.json')
        print(f"Checking {file_path}")
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        quests = data.get('quests', {})
        
        # Check if main_01_001 exists
        if 'main_01_001' not in quests:
            print("ERROR: main_01_001 not found!")
            return False

        target_quests = [
            'side_01_001',
            'quest_001',
            'quest_002',
            'quest_003',
            'quest_004',
            'quest_005',
            'quest_006',
            'quest_007'
        ]
        
        all_passed = True
        for q_id in target_quests:
            if q_id not in quests:
                print(f"ERROR: {q_id} not found!")
                all_passed = False
                continue
            
            q = quests[q_id]
            req = q.get('requires')
            if req != 'main_01_001':
                print(f"FAILURE: {q_id} requires '{req}', expected 'main_01_001'")
                all_passed = False
            else:
                print(f"SUCCESS: {q_id} correctly requires 'main_01_001'")
        
        if all_passed:
            print("\nALL CHECKS PASSED")
            return True
        else:
            print("\nSOME CHECKS FAILED")
            return False

    except Exception as e:
        print(f"An error occurred: {e}")
        return False

if __name__ == "__main__":
    success = verify_quests()
    sys.exit(0 if success else 1)
