import psycopg2
import sys

def test_conn(url):
    print(f"Testing: {url.split('@')[1]}")
    try:
        conn = psycopg2.connect(url, sslmode='require')
        print("SUCCESS")
        conn.close()
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        return False

# Try variations
urls = [
    "postgresql://postgres.ltdcdhqixvbpdcitthqf:Tad.avertising2026@aws-0-us-west-2.pooler.supabase.com:6543/postgres",
    "postgresql://postgres.ltdcdhqixvbpdcitthqf:Tad.advertising2026@aws-0-us-west-2.pooler.supabase.com:6543/postgres",
    "postgresql://postgres.ltdcdhqixvbpdcitthqf:Tad.avertising2026@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
]

for u in urls:
    if test_conn(u):
        sys.exit(0)

sys.exit(1)
