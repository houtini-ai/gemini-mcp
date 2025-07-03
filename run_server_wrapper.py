import sys
import os
import subprocess

# Method 1: Try standard user site-packages location first
user_site = os.path.expanduser(r'~\AppData\Roaming\Python\Python313\site-packages')
if os.path.exists(user_site) and user_site not in sys.path:
    sys.path.insert(0, user_site)

# Method 2: Also add the alternative location
alt_user_site = os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming', 'Python', 'Python313', 'site-packages')
if os.path.exists(alt_user_site) and alt_user_site not in sys.path:
    sys.path.insert(0, alt_user_site)

# Method 3: Check if we can get site-packages from pip
try:
    result = subprocess.run([sys.executable, '-m', 'pip', 'show', 'fastmcp'], 
                          capture_output=True, text=True)
    if result.returncode == 0:
        for line in result.stdout.split('\n'):
            if line.startswith('Location:'):
                location = line.split(':', 1)[1].strip()
                if location not in sys.path:
                    sys.path.insert(0, location)
                break
except Exception:
    pass

# Debug: Print Python path to stderr so we can see it in logs
print(f"Python executable: {sys.executable}", file=sys.stderr)
print(f"Python path: {sys.path}", file=sys.stderr)

# Now try to import and run the server
try:
    import server
except ImportError as e:
    print(f"Failed to import server: {e}", file=sys.stderr)
    print(f"Current sys.path: {sys.path}", file=sys.stderr)
    raise
