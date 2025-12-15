# Push with Token - Easiest Method

## Quick Push Command

Replace `YOUR_TOKEN_HERE` with your actual GitHub access token:

```bash
git push https://YOUR_TOKEN_HERE@github.com/pfaustino/phaser_rpg.git feature/combat-system
```

## Example

If your token is `ghp_abc123xyz...`, the command would be:

```bash
git push https://ghp_abc123xyz...@github.com/pfaustino/phaser_rpg.git feature/combat-system
```

## Alternative: Store Token in Remote URL (One-Time Setup)

You can also configure the remote to include your token:

```bash
git remote set-url origin https://YOUR_TOKEN_HERE@github.com/pfaustino/phaser_rpg.git
```

Then you can just use:
```bash
git push origin feature/combat-system
```

**Note:** This stores the token in your Git config. It's safe on your local machine, but be careful not to share your `.git/config` file.

## After First Push

Once you've pushed successfully, Windows Credential Manager (wincred) should remember your credentials for future pushes, so you can just use:

```bash
git push origin feature/combat-system
```

## Security Reminder

- Never commit your token to the repository
- Never share your token publicly
- Tokens are like passwords - keep them secret!
