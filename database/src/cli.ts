import readline from 'readline-sync';

export async function promptForYN(s: string, defVal: boolean): Promise<boolean> {
  const clause = ynClause(defVal);
  let res = await prompt(`${s} ${clause}\t`);
  while (!validateYN(res)) {
    res = await prompt(`${s} ${clause}\t`);
  }
  return getValueYN(res, defVal);
}

function ynClause(defVal: boolean): string {
  if (defVal) {
    return `[Y/n]`;
  }
  return `[y/N]`;
}

function validateYN(s: string): boolean {
  const sl = s.toLowerCase();
  return sl === '' || sl === 'y' || sl === 'n' || sl === 'yes' || sl === 'no';
}

function getValueYN(s: string, defVal: boolean): boolean {
  switch (s.toLowerCase()) {
    case 'y':
    case 'yes':
      return true;
    case 'n':
    case 'no':
      return false;
    case '':
      return defVal;
    default:
      return false;
  }
}

export async function prompt(s: string): Promise<string> {
  return new Promise((resolve) => {
    resolve(readline.question(`${s}\t`));
  });
}
