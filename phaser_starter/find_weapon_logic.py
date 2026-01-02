def find_definitions(file_path):
    targets = [
        'MapManager.transitionToMap',
        'function updateWeaponPosition',
        'function initializePlayer',
        'function updateEquipment',
        'weaponSprite ='
    ]
    with open(file_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            for target in targets:
                if target in line:
                    print(f"Line {i} ({target}): {line.strip()}")

find_definitions(r"c:\rpg\phaser_starter\game.js")
