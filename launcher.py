"""
RPG Game Launcher - Choose what to run
"""

import os
import sys
import subprocess

def clear_screen():
    """Clear the console screen"""
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    """Print the game header"""
    print("=" * 50)
    print("           RPG GAME LAUNCHER")
    print("=" * 50)
    print()

def print_menu():
    """Print the main menu"""
    print("Available Options:")
    print("1. Run Full Working Game (working_game.py)")
    print("2. Test Quest System (test_quest.py)")
    print("3. Test Dialog System (test_dialog.py)")
    print("4. Test Texture Loading (test_texture.py)")
    print("5. Test Quest Icons (test_quest_icons.py)")
    print("6. Run Simple Quest Test (simple_quest_test.py)")
    print("7. Exit")
    print()

def run_script(script_name):
    """Run a Python script"""
    try:
        print(f"Starting {script_name}...")
        print("-" * 30)
        result = subprocess.run([sys.executable, script_name], 
                              capture_output=False, text=True)
        print("-" * 30)
        print(f"{script_name} finished.")
        input("Press Enter to continue...")
    except FileNotFoundError:
        print(f"Error: {script_name} not found!")
        input("Press Enter to continue...")
    except Exception as e:
        print(f"Error running {script_name}: {e}")
        input("Press Enter to continue...")

def main():
    """Main launcher function"""
    while True:
        clear_screen()
        print_header()
        print_menu()
        
        try:
            choice = input("Enter your choice (1-7): ").strip()
            
            if choice == "1":
                run_script("working_game.py")
            elif choice == "2":
                run_script("test_quest.py")
            elif choice == "3":
                run_script("test_dialog.py")
            elif choice == "4":
                run_script("test_texture.py")
            elif choice == "5":
                run_script("test_quest_icons.py")
            elif choice == "6":
                run_script("simple_quest_test.py")
            elif choice == "7":
                print("Goodbye!")
                break
            else:
                print("Invalid choice. Please enter 1-7.")
                input("Press Enter to continue...")
                
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")
            input("Press Enter to continue...")

if __name__ == "__main__":
    main() 