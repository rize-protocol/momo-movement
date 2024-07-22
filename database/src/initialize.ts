import process from 'process';

import { DataSource } from 'typeorm';

import { promptForYN } from './cli';
import { getDatabaseConfig } from './config';

async function main() {
  console.log('>>>>>>> Processing Database >>>>>>>');
  const config = await getDatabaseConfig();
  console.log(`type\t${config.type}`);
  console.log(`database\t${config.database}`);
  console.log(`entities\t${config.entities}`);

  if (process.argv.length > 2 && process.argv[2] === '-y') {
    console.log('User prompt yes, initialize directly');
  } else {
    const res = await promptForYN('Confirm SYNCHRONIZE?', false);
    if (!res) {
      console.error('User rejected');
      process.exit(3);
    }
  }

  const dataSource = new DataSource({
    ...config,
    synchronize: true,
  });
  await dataSource.initialize();
  await dataSource.destroy();
}

main().then(() => {
  console.log('Successfully initialized data');
});
