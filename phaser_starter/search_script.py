def search_in_file(file_path, search_term):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f, 1):
                if search_term in line:
                    print(f"Line {i}: {line.strip()}")
    except Exception as e:
        print(f"Error: {e}")

print("Searching for 'pendingNewQuest'...")
search_in_file(r"c:\rpg\phaser_starter\game.js", "pendingNewQuest")

print("\nSearching for 'QUEST_AVAILABLE'...")
search_in_file(r"c:\rpg\phaser_starter\game.js", "QUEST_AVAILABLE")
