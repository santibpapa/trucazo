"""Configura únicamente la carpeta vacía del runner; nunca un proyecto alojado."""
import os
import pathlib
import secrets

assert os.environ.get('GITHUB_ACTIONS') == 'true'
root = pathlib.Path(os.environ['RUNNER_TEMP']) / 'trucazo-preview'
config = root / 'supabase/config.toml'
assert config.exists()
# Configuración mínima del CLI fijado en el workflow. Las claves cambian en cada ejecución.
config.write_text(f'''project_id = "trucazo-preview"
[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
[db]
port = 54322
shadow_port = 54320
major_version = 17
[db.seed]
enabled = false
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
enable_signup = true
enable_anonymous_sign_ins = true
jwt_secret = "{secrets.token_urlsafe(48)}"
publishable_key = "sb_publishable_{secrets.token_urlsafe(24)}"
secret_key = "sb_secret_{secrets.token_urlsafe(32)}"
[auth.email]
enable_signup = false
[auth.rate_limit]
anonymous_users = 100
[realtime]
enabled = true
[studio]
enabled = false
[inbucket]
enabled = false
[storage]
enabled = true
[analytics]
enabled = false
[edge_runtime]
enabled = false
''')
config.chmod(0o600)
