const net = require('net');

const regions = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
  'sa-east-1', 'ap-southeast-1', 'ap-northeast-1', 'ap-northeast-2',
  'ap-southeast-2', 'ap-south-1', 'ca-central-1'
];

async function checkPooler(region) {
  return new Promise((resolve) => {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const socket = new net.Socket();
    let connected = false;

    socket.setTimeout(2500);

    socket.on('connect', () => {
      connected = true;
      socket.write(
        Buffer.from([0, 0, 0, 8, 4, 210, 22, 47]) // SSLRequest
      );
    });

    socket.on('data', (data) => {
      // Look for S (SSL support)
      if (data.toString() === 'S') {
        resolve(host);
      } else {
        // Pooler exists but behaves differently, might still be right host
        resolve(host);
      }
      socket.destroy();
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });

    socket.on('error', () => {
      resolve(null);
    });

    socket.connect(6543, host);
  });
}

async function run() {
  for (const region of regions) {
    const host = await checkPooler(region);
    if (host) {
      console.log(`FOUND RESPONSIVE POOLER: ${host}`);
    }
  }
}
run();
