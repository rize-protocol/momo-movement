# Movement Gaming Database

Movement gaming database management. Currently, only initialize is supported.

### Install and initialize mysql on local

**MacOS**

```shell
brew install mysql
mysql -u root

> create database movement_gaming_local;
```

Create a new user and grant permission to database

```shell
> CREATE USER 'movement'@'localhost' IDENTIFIED BY 'movement';
> use movement_gaming_local;
> GRANT ALL PRIVILEGES ON movement_gaming_local.* TO 'movement'@'localhost';
> exit
```

Test our new user connection:

```shell
mysql -u movement -p
// Input password `movement`
use movement_gaming_local
```

Now you have user and database set.

### Scripts

**Database initialization**

After the database has been created, use `scripts/initialize.ts` to initialize the
database schema.

```shell
yarn initialize
```

### Install and initialize redis on local

**MacOS**

install redis
```shell
brew install redis
```

start redis as daemon
```shell
brew services start redis
```
