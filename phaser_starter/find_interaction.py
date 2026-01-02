def find_definition(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            if 'function triggerWorldInteraction' in line or 'triggerWorldInteraction =' in line:
                print(f"Line {i}: {line.strip()}")

find_definition(r"c:\rpg\phaser_starter\game.js")
