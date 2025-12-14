"""
Working RPG Game - Combines tested systems
"""

import pygame
import sys
import os
import json
import random
import math

# Import monster system
try:
    from rpg_modules.entities.monster_icons import MonsterIcon
    from rpg_modules.entities.monster import MonsterType
    MONSTER_ICONS_AVAILABLE = True
except ImportError:
    MONSTER_ICONS_AVAILABLE = False

# Constants
SCREEN_WIDTH = 1024
SCREEN_HEIGHT = 768
FPS = 60
TILE_SIZE = 32
GAME_TITLE = "RPG Game"

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (100, 100, 100)
LIGHT_GRAY = (200, 200, 200)
DARK_GRAY = (50, 50, 50)
BLUE = (0, 0, 255)
GREEN = (0, 255, 0)
RED = (255, 0, 0)
YELLOW = (255, 255, 0)
PURPLE = (128, 0, 128)
GOLD = (218, 165, 32)

class SimpleMonster:
    """Simple monster class for when the full system isn't available"""
    def __init__(self, x, y, monster_type="slime"):
        self.x = x
        self.y = y
        self.monster_type = monster_type
        self.health = 50
        self.max_health = 50
        self.speed = 1.0
        self.direction = random.randint(0, 3)  # 0=up, 1=right, 2=down, 3=left
        self.move_timer = 0
        self.chase_range = 5 * TILE_SIZE
        
        # Set stats based on type
        if monster_type == "dragon":
            self.health = self.max_health = 150
            self.speed = 0.8
        elif monster_type == "spider":
            self.health = self.max_health = 60
            self.speed = 1.5
        elif monster_type == "ghost":
            self.health = self.max_health = 40
            self.speed = 1.2
        elif monster_type == "skeleton":
            self.health = self.max_health = 70
            self.speed = 1.0
        elif monster_type == "slime":
            self.health = self.max_health = 30
            self.speed = 0.5
    
    def update(self, dt, player_pos, game=None):
        """Update monster position and behavior"""
        # Calculate distance to player (in pixels)
        dx = player_pos[0] - self.x
        dy = player_pos[1] - self.y
        distance = math.sqrt(dx * dx + dy * dy)
        
        # If player is in chase range, move towards them
        if distance < self.chase_range:
            # Stop if adjacent (distance <= TILE_SIZE)
            if distance > TILE_SIZE:  # Only move if not adjacent
                # Normalize direction
                if distance > 0:
                    dx /= distance
                    dy /= distance
                # Calculate intended new tile
                new_x = self.x + dx * self.speed * dt * 60
                new_y = self.y + dy * self.speed * dt * 60
                tile_x = int(round(new_x / TILE_SIZE))
                tile_y = int(round(new_y / TILE_SIZE))
                # Prevent overlap
                if game and not game.is_tile_occupied_by_monster(tile_x, tile_y, exclude_monster=self):
                    self.x = new_x
                    self.y = new_y
                # Update direction
                if abs(dx) > abs(dy):
                    self.direction = 1 if dx > 0 else 3  # Right or Left
                else:
                    self.direction = 2 if dy > 0 else 0  # Down or Up
            # else: do not move, already adjacent
        else:
            # Random movement when not chasing
            self.move_timer += dt
            if self.move_timer > 2.0:  # Change direction every 2 seconds
                self.direction = random.randint(0, 3)
                self.move_timer = 0
            # Move in current direction
            if self.direction == 0:  # Up
                new_y = self.y - self.speed * dt * 60
                tile_x = int(round(self.x / TILE_SIZE))
                tile_y = int(round(new_y / TILE_SIZE))
                if game and not game.is_tile_occupied_by_monster(tile_x, tile_y, exclude_monster=self):
                    self.y = new_y
            elif self.direction == 1:  # Right
                new_x = self.x + self.speed * dt * 60
                tile_x = int(round(new_x / TILE_SIZE))
                tile_y = int(round(self.y / TILE_SIZE))
                if game and not game.is_tile_occupied_by_monster(tile_x, tile_y, exclude_monster=self):
                    self.x = new_x
            elif self.direction == 2:  # Down
                new_y = self.y + self.speed * dt * 60
                tile_x = int(round(self.x / TILE_SIZE))
                tile_y = int(round(new_y / TILE_SIZE))
                if game and not game.is_tile_occupied_by_monster(tile_x, tile_y, exclude_monster=self):
                    self.y = new_y
            elif self.direction == 3:  # Left
                new_x = self.x - self.speed * dt * 60
                tile_x = int(round(new_x / TILE_SIZE))
                tile_y = int(round(self.y / TILE_SIZE))
                if game and not game.is_tile_occupied_by_monster(tile_x, tile_y, exclude_monster=self):
                    self.x = new_x
    
    def draw(self, screen, camera_x, camera_y):
        """Draw the monster"""
        screen_x = (self.x - camera_x) * TILE_SIZE
        screen_y = (self.y - camera_y) * TILE_SIZE
        
        # Choose color based on monster type
        colors = {
            "slime": GREEN,
            "spider": (139, 69, 19),  # Brown
            "ghost": (200, 200, 255),  # Light blue
            "skeleton": (255, 255, 240),  # Off-white
            "dragon": RED
        }
        color = colors.get(self.monster_type, RED)
        
        # Draw monster as a circle
        pygame.draw.circle(screen, color, 
                          (int(screen_x + TILE_SIZE // 2), int(screen_y + TILE_SIZE // 2)), 
                          TILE_SIZE // 3)
        pygame.draw.circle(screen, BLACK, 
                          (int(screen_x + TILE_SIZE // 2), int(screen_y + TILE_SIZE // 2)), 
                          TILE_SIZE // 3, 2)
        
        # Draw health bar
        bar_width = TILE_SIZE
        bar_height = 4
        health_percent = self.health / self.max_health
        
        # Background
        pygame.draw.rect(screen, RED, 
                        (screen_x, screen_y - 10, bar_width, bar_height))
        # Health
        pygame.draw.rect(screen, GREEN, 
                        (screen_x, screen_y - 10, int(bar_width * health_percent), bar_height))
        # Border
        pygame.draw.rect(screen, BLACK, 
                        (screen_x, screen_y - 10, bar_width, bar_height), 1)

class Player:
    """Simple player class"""
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.health = 100
        self.max_health = 100
        self.level = 1
        self.experience = 0
        self.gold = 0
        self.inventory = {}
        self.kills = {}
        self.visited_locations = set()
        self.dialog_complete = set()

class GameMap:
    """Simple game map with different terrain types"""
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.tiles = self.generate_map()
        self.textures = self.load_textures()
        
    def load_textures(self):
        """Load texture images"""
        textures = {}
        try:
            # Load available textures
            texture_files = {
                "grass": "assets/images/tiles/tile_floor_grass.png",
                "grass_flowers": "assets/images/tiles/tile_floor_grass_flowers.png",
                "stone": "assets/images/tiles/tile_floor_stone.png",
                "dirt": "assets/images/tiles/tile_floor_dirt.png",
                "sand": "assets/images/tiles/tile_floor_sand.png",
                "flower": "assets/images/tiles/tile_deco_flower.png"
            }
            
            for tile_type, file_path in texture_files.items():
                if os.path.exists(file_path):
                    texture = pygame.image.load(file_path)
                    # Scale texture to tile size
                    texture = pygame.transform.scale(texture, (TILE_SIZE, TILE_SIZE))
                    textures[tile_type] = texture
                    print(f"Loaded texture: {tile_type} from {file_path}")
                else:
                    print(f"Warning: Texture file not found: {file_path}")
                    
        except Exception as e:
            print(f"Error loading textures: {e}")
            
        return textures
        
    def generate_map(self):
        """Generate a simple map with different terrain"""
        tiles = []
        for y in range(self.height):
            row = []
            for x in range(self.width):
                # Create different terrain types
                if x == 0 or x == self.width - 1 or y == 0 or y == self.height - 1:
                    tile_type = "wall"
                elif random.random() < 0.05:
                    tile_type = "flower"
                elif random.random() < 0.1:
                    tile_type = "grass_flowers"
                elif random.random() < 0.15:
                    tile_type = "sand"
                elif random.random() < 0.25:
                    tile_type = "dirt"
                elif random.random() < 0.35:
                    tile_type = "stone"
                else:
                    tile_type = "grass"
                row.append(tile_type)
            tiles.append(row)
        return tiles
    
    def get_tile_color(self, tile_type):
        """Get color for tile type (fallback if texture not available)"""
        colors = {
            "grass": (34, 139, 34),
            "grass_flowers": (50, 205, 50),
            "water": (0, 105, 148),
            "sand": (238, 214, 175),
            "stone": (128, 128, 128),
            "dirt": (139, 69, 19),
            "wall": (90, 90, 90),
            "flower": (255, 20, 147)
        }
        return colors.get(tile_type, (0, 0, 0))

class Game:
    """Main game class"""
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption(GAME_TITLE)
        self.clock = pygame.time.Clock()
        
        # Initialize game components
        self.map = GameMap(50, 50)
        self.player = Player(25, 25)  # Start in center
        
        # Load fonts
        self.font = pygame.font.Font(None, 24)
        self.title_font = pygame.font.Font(None, 32)
        
        # Game state
        self.running = True
        self.show_quest = False
        self.show_dialog = False
        self.current_quest = None
        self.current_dialog = None
        
        # Load quests
        self.quests = self.load_quests()
        if self.quests:
            self.current_quest = self.quests[0]
        
        # Camera offset
        self.camera_x = 0
        self.camera_y = 0
        
        # Movement timing
        self.move_delay = 150  # milliseconds between moves
        self.last_move_time = 0
        self.keys_pressed = set()  # Track which keys are currently pressed
        self.last_move_dir = (0, 0)  # (dx, dy) direction of last movement
        
        # Monster system
        self.monsters = []
        self.spawn_monsters()
        self.damage_feedback = []  # List of (x, y, text, timer)
        self.player_last_hit_time = 0
        self.player_damage_feedback = []  # List of (x, y, text, timer)
        self.monster_icon_cache = {}
        
    def is_tile_occupied_by_monster(self, tile_x, tile_y, exclude_monster=None):
        for m in self.monsters:
            if m is exclude_monster:
                continue
            mx = int(round(m.x / TILE_SIZE))
            my = int(round(m.y / TILE_SIZE))
            if (mx, my) == (tile_x, tile_y):
                return True
        return False

    def spawn_monsters(self):
        """Spawn initial monsters on the map"""
        monster_types = ["slime", "spider", "ghost", "skeleton", "dragon"]
        monster_counts = [8, 5, 3, 4, 1]  # Number of each type
        
        for monster_type, count in zip(monster_types, monster_counts):
            for _ in range(count):
                # Get random position away from player
                while True:
                    x = random.randint(5, self.map.width - 5)
                    y = random.randint(5, self.map.height - 5)
                    
                    # Check distance from player
                    dx = x - self.player.x
                    dy = y - self.player.y
                    distance = math.sqrt(dx * dx + dy * dy)
                    
                    # Spawn monsters at least 10 tiles away from player
                    if distance > 10 and self.map.tiles[y][x] != "wall" and not self.is_tile_occupied_by_monster(x, y):
                        break
                
                # Create monster
                if MONSTER_ICONS_AVAILABLE:
                    try:
                        # Try to use the full monster system
                        monster_type_enum = getattr(MonsterType, monster_type.upper())
                        monster = SimpleMonster(x * TILE_SIZE, y * TILE_SIZE, monster_type_enum.name.lower())
                        monster.monster_type = monster_type_enum  # For MonsterIcon
                    except:
                        # Fall back to simple monster
                        monster = SimpleMonster(x * TILE_SIZE, y * TILE_SIZE, monster_type)
                else:
                    monster = SimpleMonster(x * TILE_SIZE, y * TILE_SIZE, monster_type)
                
                self.monsters.append(monster)
                print(f"Spawned {monster_type} at ({x}, {y})")
    
    def load_quests(self):
        """Load quests from file"""
        try:
            with open("data/quests/side_quests.json", 'r') as f:
                data = json.load(f)
                return data.get("quests", [])
        except:
            return []
    
    def handle_events(self):
        """Handle pygame events"""
        current_time = pygame.time.get_ticks()
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    self.running = False
                elif event.key == pygame.K_q:
                    self.show_quest = not self.show_quest
                elif event.key == pygame.K_d:
                    self.show_dialog = not self.show_dialog
                elif event.key == pygame.K_SPACE:
                    self.add_quest_progress()
                elif event.key == pygame.K_f:
                    self.player_attack()
                elif event.key == pygame.K_h:
                    self.player_heal()
                elif event.key in [pygame.K_w, pygame.K_UP]:
                    self.keys_pressed.add(event.key)
                    self.last_move_dir = (0, -1)
                elif event.key in [pygame.K_s, pygame.K_DOWN]:
                    self.keys_pressed.add(event.key)
                    self.last_move_dir = (0, 1)
                elif event.key in [pygame.K_a, pygame.K_LEFT]:
                    self.keys_pressed.add(event.key)
                    self.last_move_dir = (-1, 0)
                elif event.key in [pygame.K_d, pygame.K_RIGHT]:
                    self.keys_pressed.add(event.key)
                    self.last_move_dir = (1, 0)
            elif event.type == pygame.KEYUP:
                if event.key in [pygame.K_w, pygame.K_s, pygame.K_a, pygame.K_d,
                               pygame.K_UP, pygame.K_DOWN, pygame.K_LEFT, pygame.K_RIGHT]:
                    self.keys_pressed.discard(event.key)
        # Handle movement with timing
        if current_time - self.last_move_time >= self.move_delay:
            moved = False
            # Check for movement keys and move only one direction at a time
            px, py = self.player.x, self.player.y
            if (pygame.K_w in self.keys_pressed or pygame.K_UP in self.keys_pressed) and not moved:
                dest = (px, py - 1)
                if self.can_player_move_to(dest[0], dest[1]):
                    self.player.y = max(1, py - 1)
                    moved = True
            elif (pygame.K_s in self.keys_pressed or pygame.K_DOWN in self.keys_pressed) and not moved:
                dest = (px, py + 1)
                if self.can_player_move_to(dest[0], dest[1]):
                    self.player.y = min(self.map.height - 2, py + 1)
                    moved = True
            elif (pygame.K_a in self.keys_pressed or pygame.K_LEFT in self.keys_pressed) and not moved:
                dest = (px - 1, py)
                if self.can_player_move_to(dest[0], dest[1]):
                    self.player.x = max(1, px - 1)
                    moved = True
            elif (pygame.K_d in self.keys_pressed or pygame.K_RIGHT in self.keys_pressed) and not moved:
                dest = (px + 1, py)
                if self.can_player_move_to(dest[0], dest[1]):
                    self.player.x = min(self.map.width - 2, px + 1)
                    moved = True
            if moved:
                self.last_move_time = current_time
    
    def add_quest_progress(self):
        """Add progress to current quest"""
        if not self.current_quest:
            return
            
        for objective in self.current_quest["objectives"]:
            if objective["type"] == "kill":
                monster_id = objective["target_monster"]
                self.player.kills[monster_id] = self.player.kills.get(monster_id, 0) + 1
            elif objective["type"] == "collect":
                item_id = objective["target_item"]
                self.player.inventory[item_id] = self.player.inventory.get(item_id, 0) + 1
            elif objective["type"] == "explore":
                location_id = objective["target_location"]
                self.player.visited_locations.add(location_id)
            elif objective["type"] == "dialog":
                dialog_id = objective["dialog_id"]
                self.player.dialog_complete.add(dialog_id)
    
    def update_camera(self):
        """Update camera to follow player"""
        self.camera_x = self.player.x - SCREEN_WIDTH // (2 * TILE_SIZE)
        self.camera_y = self.player.y - SCREEN_HEIGHT // (2 * TILE_SIZE)
        
        # Clamp camera to map bounds
        self.camera_x = max(0, min(self.camera_x, self.map.width - SCREEN_WIDTH // TILE_SIZE))
        self.camera_y = max(0, min(self.camera_y, self.map.height - SCREEN_HEIGHT // TILE_SIZE))
    
    def draw_map(self):
        """Draw the game map"""
        # Calculate visible tile range
        start_x = max(0, self.camera_x)
        end_x = min(self.map.width, self.camera_x + SCREEN_WIDTH // TILE_SIZE + 1)
        start_y = max(0, self.camera_y)
        end_y = min(self.map.height, self.camera_y + SCREEN_HEIGHT // TILE_SIZE + 1)
        
        for y in range(start_y, end_y):
            for x in range(start_x, end_x):
                tile_type = self.map.tiles[y][x]
                
                # Calculate screen position
                screen_x = (x - self.camera_x) * TILE_SIZE
                screen_y = (y - self.camera_y) * TILE_SIZE
                
                # Try to use texture first, fall back to color
                if tile_type in self.map.textures:
                    # Draw texture
                    texture = self.map.textures[tile_type]
                    self.screen.blit(texture, (screen_x, screen_y))
                else:
                    # Fall back to colored rectangle
                    color = self.map.get_tile_color(tile_type)
                    pygame.draw.rect(self.screen, color, 
                                   (screen_x, screen_y, TILE_SIZE, TILE_SIZE))
                
                # Draw tile border (optional - comment out if you don't want borders)
                pygame.draw.rect(self.screen, BLACK, 
                               (screen_x, screen_y, TILE_SIZE, TILE_SIZE), 1)
    
    def draw_player(self):
        """Draw the player"""
        screen_x = (self.player.x - self.camera_x) * TILE_SIZE
        screen_y = (self.player.y - self.camera_y) * TILE_SIZE
        
        # Draw player as a circle
        pygame.draw.circle(self.screen, YELLOW, 
                          (screen_x + TILE_SIZE // 2, screen_y + TILE_SIZE // 2), 
                          TILE_SIZE // 3)
        pygame.draw.circle(self.screen, BLACK, 
                          (screen_x + TILE_SIZE // 2, screen_y + TILE_SIZE // 2), 
                          TILE_SIZE // 3, 2)
        # Draw player health bar
        bar_width = TILE_SIZE
        bar_height = 6
        health_percent = max(0, min(1, self.player.health / self.player.max_health))
        pygame.draw.rect(self.screen, RED, (screen_x, screen_y + TILE_SIZE + 2, bar_width, bar_height))
        pygame.draw.rect(self.screen, GREEN, (screen_x, screen_y + TILE_SIZE + 2, int(bar_width * health_percent), bar_height))
        pygame.draw.rect(self.screen, BLACK, (screen_x, screen_y + TILE_SIZE + 2, bar_width, bar_height), 1)
        # Draw player damage/heal feedback
        for fb in self.player_damage_feedback:
            px, py, text, timer, *color = fb
            fx = (px - self.camera_x) * TILE_SIZE
            fy = (py - self.camera_y) * TILE_SIZE
            col = color[0] if color else RED
            text_surface = self.font.render(text, True, col)
            self.screen.blit(text_surface, (fx + TILE_SIZE // 2 - 10, fy - 20 - int((0.7 - timer) * 30)))
    
    def draw_ui(self):
        """Draw UI elements"""
        # Draw player stats
        stats_text = [
            f"Health: {self.player.health}/{self.player.max_health}",
            f"Level: {self.player.level}",
            f"Experience: {self.player.experience}",
            f"Gold: {self.player.gold}",
            f"Position: ({self.player.x}, {self.player.y})"
        ]
        
        for i, text in enumerate(stats_text):
            text_surface = self.font.render(text, True, WHITE)
            self.screen.blit(text_surface, (10, 10 + i * 25))
        
        # Draw controls
        controls = [
            "WASD: Move",
            "Q: Toggle Quest",
            "D: Toggle Dialog", 
            "SPACE: Add Quest Progress",
            "ESC: Exit"
        ]
        
        for i, text in enumerate(controls):
            text_surface = self.font.render(text, True, LIGHT_GRAY)
            self.screen.blit(text_surface, (SCREEN_WIDTH - 200, 10 + i * 25))
    
    def draw_quest_panel(self):
        """Draw quest information"""
        if not self.show_quest or not self.current_quest:
            return
            
        # Draw quest panel background
        panel_rect = pygame.Rect(SCREEN_WIDTH // 2 - 300, 50, 600, 400)
        pygame.draw.rect(self.screen, DARK_GRAY, panel_rect)
        pygame.draw.rect(self.screen, WHITE, panel_rect, 2)
        
        # Draw quest title
        title_text = self.title_font.render(self.current_quest["title"], True, GOLD)
        self.screen.blit(title_text, (panel_rect.x + 20, panel_rect.y + 20))
        
        # Draw quest description
        desc_text = self.font.render(self.current_quest["description"], True, WHITE)
        self.screen.blit(desc_text, (panel_rect.x + 20, panel_rect.y + 60))
        
        # Draw objectives
        y_offset = 100
        for i, objective in enumerate(self.current_quest["objectives"]):
            # Check if objective is complete
            completed = False
            if objective["type"] == "kill":
                monster_id = objective["target_monster"]
                current = self.player.kills.get(monster_id, 0)
                required = objective["amount"]
                completed = current >= required
                progress_text = f"{current}/{required}"
            elif objective["type"] == "collect":
                item_id = objective["target_item"]
                current = self.player.inventory.get(item_id, 0)
                required = objective["amount"]
                completed = current >= required
                progress_text = f"{current}/{required}"
            elif objective["type"] == "explore":
                location_id = objective["target_location"]
                completed = location_id in self.player.visited_locations
                progress_text = "Explored" if completed else "Not Explored"
            elif objective["type"] == "dialog":
                dialog_id = objective["dialog_id"]
                completed = dialog_id in self.player.dialog_complete
                progress_text = "Completed" if completed else "Not Completed"
            
            # Draw objective
            color = GREEN if completed else WHITE
            obj_text = f"{objective['description']} - {progress_text}"
            text_surface = self.font.render(obj_text, True, color)
            self.screen.blit(text_surface, (panel_rect.x + 20, panel_rect.y + y_offset))
            y_offset += 30
        
        # Draw rewards
        rewards = self.current_quest["rewards"]
        reward_text = f"Rewards: {rewards['xp']} XP, {rewards['gold']} Gold"
        reward_surface = self.font.render(reward_text, True, GOLD)
        self.screen.blit(reward_surface, (panel_rect.x + 20, panel_rect.y + y_offset + 20))
    
    def draw_dialog_panel(self):
        """Draw dialog information"""
        if not self.show_dialog:
            return
            
        # Draw dialog panel background
        panel_rect = pygame.Rect(SCREEN_WIDTH // 2 - 300, 50, 600, 400)
        pygame.draw.rect(self.screen, DARK_GRAY, panel_rect)
        pygame.draw.rect(self.screen, WHITE, panel_rect, 2)
        
        # Draw dialog title
        title_text = self.title_font.render("Dialog System", True, WHITE)
        self.screen.blit(title_text, (panel_rect.x + 20, panel_rect.y + 20))
        
        # Draw dialog information
        dialog_info = [
            "Dialog system is working!",
            "You can create conversations with NPCs.",
            "Dialogs can trigger quests and story events.",
            "Press SPACE to simulate dialog completion."
        ]
        
        for i, text in enumerate(dialog_info):
            text_surface = self.font.render(text, True, WHITE)
            self.screen.blit(text_surface, (panel_rect.x + 20, panel_rect.y + 80 + i * 30))
    
    def run(self):
        """Main game loop"""
        while self.running:
            # Calculate delta time
            dt = self.clock.tick(FPS) / 1000.0
            
            # Handle events
            self.handle_events()
            
            # Update camera
            self.update_camera()
            
            # Update monsters
            self.update_monsters(dt)
            
            # Update feedback timers (damage, heal text)
            self.update()
            
            # Clear screen
            self.screen.fill(BLACK)
            
            # Draw game elements
            self.draw_map()
            self.draw_monsters()
            self.draw_player()
            self.draw_ui()
            
            # Draw UI panels
            if self.show_quest:
                self.draw_quest_panel()
            if self.show_dialog:
                self.draw_dialog_panel()
            
            # Update display
            pygame.display.flip()
        
        pygame.quit()
        sys.exit()
    
    def update_monsters(self, dt):
        """Update all monsters"""
        player_pos = (self.player.x * TILE_SIZE, self.player.y * TILE_SIZE)
        
        for monster in self.monsters[:]:  # Copy list to avoid modification during iteration
            # Update monster
            if hasattr(monster, 'update'):
                # Pass self (game) to update for overlap check
                try:
                    monster.update(dt, player_pos, game=self)
                except TypeError:
                    monster.update(dt, player_pos)
            
            # Check if monster is too far from player and remove it
            dx = monster.x - player_pos[0]
            dy = monster.y - player_pos[1]
            distance = math.sqrt(dx * dx + dy * dy)
            
            # Monster attacks player if adjacent
            if distance <= TILE_SIZE * 1.1:
                self.monster_attack_player(monster)
            # Remove monsters that are too far away (optional for performance)
            if distance > 100 * TILE_SIZE:
                self.monsters.remove(monster)
    
    def draw_monsters(self):
        """Draw all monsters with sprites if available"""
        for monster in self.monsters:
            if hasattr(monster, 'x') and hasattr(monster, 'y'):
                mx, my = monster.x, monster.y
                tile_x = int(round(mx / TILE_SIZE))
                tile_y = int(round(my / TILE_SIZE))
                screen_x = (tile_x - self.camera_x) * TILE_SIZE
                screen_y = (tile_y - self.camera_y) * TILE_SIZE
                # Try to use MonsterIcon if available
                if MONSTER_ICONS_AVAILABLE and hasattr(monster, 'monster_type'):
                    icon_key = str(getattr(monster, 'monster_type', 'unknown'))
                    if icon_key not in self.monster_icon_cache:
                        try:
                            # If monster_type is a string, convert to MonsterType if possible
                            mtype = getattr(monster, 'monster_type', None)
                            if isinstance(mtype, str) and hasattr(MonsterType, mtype.upper()):
                                mtype = getattr(MonsterType, mtype.upper())
                            icon = MonsterIcon(mtype)
                            self.monster_icon_cache[icon_key] = icon
                        except Exception:
                            self.monster_icon_cache[icon_key] = None
                    icon = self.monster_icon_cache[icon_key]
                    if icon:
                        # Render the icon to a surface and blit
                        icon_surface = pygame.Surface((TILE_SIZE, TILE_SIZE), pygame.SRCALPHA)
                        icon.render(icon_surface, TILE_SIZE)
                        self.screen.blit(icon_surface, (screen_x, screen_y))
                    else:
                        # Fallback to circle
                        pygame.draw.circle(self.screen, RED, (int(screen_x + TILE_SIZE // 2), int(screen_y + TILE_SIZE // 2)), TILE_SIZE // 3)
                        pygame.draw.circle(self.screen, BLACK, (int(screen_x + TILE_SIZE // 2), int(screen_y + TILE_SIZE // 2)), TILE_SIZE // 3, 2)
                else:
                    # Fallback to circle
                    pygame.draw.circle(self.screen, RED, (int(screen_x + TILE_SIZE // 2), int(screen_y + TILE_SIZE // 2)), TILE_SIZE // 3)
                    pygame.draw.circle(self.screen, BLACK, (int(screen_x + TILE_SIZE // 2), int(screen_y + TILE_SIZE // 2)), TILE_SIZE // 3, 2)
                # Draw health bar
                bar_width = TILE_SIZE
                bar_height = 4
                health = getattr(monster, 'health', 1)
                max_health = getattr(monster, 'max_health', 1)
                health_percent = max(0, min(1, health / max_health))
                pygame.draw.rect(self.screen, RED, (screen_x, screen_y - 10, bar_width, bar_height))
                pygame.draw.rect(self.screen, GREEN, (screen_x, screen_y - 10, int(bar_width * health_percent), bar_height))
                pygame.draw.rect(self.screen, BLACK, (screen_x, screen_y - 10, bar_width, bar_height), 1)
            elif hasattr(monster, 'draw'):
                monster.draw(self.screen, self.camera_x, self.camera_y)
        # Draw damage feedback
        for fb in self.damage_feedback:
            mx, my, text, timer = fb
            screen_x = (mx - self.camera_x) * TILE_SIZE
            screen_y = (my - self.camera_y) * TILE_SIZE
            text_surface = self.font.render(text, True, YELLOW)
            self.screen.blit(text_surface, (screen_x + TILE_SIZE // 2 - 10, screen_y - 20 - int((0.7 - timer) * 30)))

    def player_attack(self):
        """Attack in the direction of last movement, damaging a monster in the adjacent tile."""
        px, py = self.player.x, self.player.y
        dx, dy = self.last_move_dir
        target_tile = (int(px + dx), int(py + dy))
        for monster in self.monsters:
            mx = int(round(monster.x / TILE_SIZE))
            my = int(round(monster.y / TILE_SIZE))
            if (mx, my) == target_tile:
                monster.health -= 10
                # Add feedback
                self.damage_feedback.append([mx, my, "-10", 0.7])  # 0.7 seconds
                if monster.health <= 0:
                    self.monsters.remove(monster)
                break  # Only hit one monster per attack

    def update(self):
        # Update damage feedback timers
        for fb in self.damage_feedback[:]:
            fb[3] -= 1 / FPS
            if fb[3] <= 0:
                self.damage_feedback.remove(fb)
        # Update player damage feedback timers
        for fb in self.player_damage_feedback[:]:
            fb[3] -= 1 / FPS
            if fb[3] <= 0:
                self.player_damage_feedback.remove(fb)

    def can_player_move_to(self, x, y):
        # Prevent moving into a monster
        if self.is_tile_occupied_by_monster(int(x), int(y)):
            return False
        # Prevent moving into walls
        if self.map.tiles[int(y)][int(x)] == "wall":
            return False
        return True

    def monster_attack_player(self, monster):
        now = pygame.time.get_ticks()
        # Attack cooldown: 1 second
        if now - self.player_last_hit_time > 1000:
            self.player_last_hit_time = now
            damage = 10
            self.player.health -= damage
            # Add feedback
            self.player_damage_feedback.append([self.player.x, self.player.y, f"-{damage}", 0.7])
            if self.player.health < 0:
                self.player.health = 0

    def player_heal(self):
        heal_amount = 20
        if self.player.health < self.player.max_health:
            new_health = min(self.player.max_health, self.player.health + heal_amount)
            actual_heal = new_health - self.player.health
            self.player.health = new_health
            # Add green feedback
            self.player_damage_feedback.append([self.player.x, self.player.y, f"+{actual_heal}", 0.7, (0,255,0)])

def main():
    """Main entry point"""
    # Create necessary directories
    os.makedirs("data/quests", exist_ok=True)
    os.makedirs("data/quests/dialogs", exist_ok=True)
    
    # Start the game
    game = Game()
    game.run()

if __name__ == "__main__":
    main() 