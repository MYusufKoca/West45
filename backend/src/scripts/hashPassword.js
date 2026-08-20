const bcrypt = require('bcryptjs');

function readPassword() {
  if (!process.stdin.isTTY) {
    throw new Error('Run this command in an interactive terminal.');
  }

  return new Promise((resolve, reject) => {
    let password = '';
    process.stdout.write('Admin password: ');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (character) => {
      if (character === '\u0003') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.off('data', onData);
        reject(new Error('Password entry cancelled.'));
      } else if (character === '\r' || character === '\n') {
        process.stdout.write('\n');
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.off('data', onData);
        resolve(password);
      } else if (character === '\u007f') {
        password = password.slice(0, -1);
      } else {
        password += character;
      }
    };

    process.stdin.on('data', onData);
  });
}

(async () => {
  try {
    const password = await readPassword();
    if (!password) throw new Error('Password cannot be empty.');
    console.log(await bcrypt.hash(password, 12));
  } catch (error) {
    console.error('Password hashing failed:', error.message);
    process.exitCode = 1;
  }
})();
