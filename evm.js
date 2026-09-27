const { initDB, run, get, all, transaction } = require('./db');

// Configuración de la billetera de recolección de comisiones (Gas Fee)
const GASFEE_WALLET = "";
const GASFEE_PRIVATEKEY = ""; // Clave privada asignada a la billetera de gas
const GAS_BANDS = [0.10, 0.20, 0.30];

/**
 * Genera cadenas alfanuméricas aleatorias.
 * @param {number} length - Longitud de la cadena a generar.
 * @param {boolean} includeUppercase - Incluir caracteres en mayúscula si es true.
 */
function generateRandomString(length, includeUppercase = true) {
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const mixedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const characters = includeUppercase ? mixedChars : lowercaseChars;
  let result = '';
  for (let i = 0; i < length; i++) {
    const r = Math.floor(Math.random() * characters.length);
    result += characters.charAt(r);
  }
  return result;
}

/**
 * Algoritmo Hash de prueba para generar identificadores únicos de transacciones y bloques.
 */
function customHash(str) {
    const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 60; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        result += charset.charAt(randomIndex);
    }
    return result;
}

function generatePrivateAddress() {
  return generateRandomString(50, true);
}

function generatePrivateKey() {
  return generateRandomString(77, true);
}

function generatePublicAddress() {
  return generateRandomString(50, true);
}

/**
 * Calcula la comisión de gas basada en bandas de porcentaje dinámicas según el tiempo.
 */
function calculateGasFee(amount) {
  const value = Number(amount);
  const index = Math.floor(Date.now() / 120000) % GAS_BANDS.length;
  const percentage = GAS_BANDS[index];
  return Number((value * percentage).toFixed(8));
}

// Creación y estandarización de tablas para MariaDB / MySQL
async function ensureTables() {
  await initDB();

  await run(`
    CREATE TABLE IF NOT EXISTS accounts (
        private_address VARCHAR(80) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        testnet_balance DECIMAL(36,8) NOT NULL DEFAULT 0.00000000,
        mainnet_balance DECIMAL(36,8) NOT NULL DEFAULT 0.00000000,

        PRIMARY KEY (private_address)
    ) ENGINE=InnoDB
      DEFAULT CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS account_keys (
        private_address VARCHAR(80) NOT NULL,
        private_key VARCHAR(128) NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        PRIMARY KEY (private_address),
        UNIQUE KEY uk_account_keys_private_key (private_key),
        CONSTRAINT fk_account_keys_accounts FOREIGN KEY (private_address) 
            REFERENCES accounts(private_address)
            ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB
      DEFAULT CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS temporary_addresses (
        public_address VARCHAR(80) NOT NULL,
        private_address VARCHAR(80) NOT NULL,
        expires_at BIGINT NOT NULL,

        PRIMARY KEY (public_address),
        CONSTRAINT fk_temp_accounts FOREIGN KEY (private_address) 
            REFERENCES accounts(private_address)
            ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB
      DEFAULT CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci;
  `);

  // Se agregaron sender_private_address y recipient_private_address
  await run(`
    CREATE TABLE IF NOT EXISTS blocks (
        id BIGINT AUTO_INCREMENT NOT NULL,
        network_id VARCHAR(10) NOT NULL,
        block_hash VARCHAR(64) NOT NULL,
        previous_block_hash VARCHAR(64) DEFAULT NULL,
        transaction_id BIGINT NOT NULL,
        transaction_hash VARCHAR(64) NOT NULL,
        sender_public_address VARCHAR(80) NOT NULL,
        recipient_public_address VARCHAR(80) NOT NULL,
        sender_private_address VARCHAR(80) NOT NULL,
        recipient_private_address VARCHAR(80) NOT NULL,
        amount DECIMAL(36,8) NOT NULL,
        gas_fee DECIMAL(36,8) NOT NULL DEFAULT 0.00000000,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id),
        UNIQUE KEY uk_blocks_block_hash (block_hash),
        INDEX idx_blocks_network_id (network_id),
        INDEX idx_blocks_transaction_hash (transaction_hash),
        CONSTRAINT fk_blocks_sender_priv FOREIGN KEY (sender_private_address) REFERENCES accounts(private_address),
        CONSTRAINT fk_blocks_recipient_priv FOREIGN KEY (recipient_private_address) REFERENCES accounts(private_address)
    ) ENGINE=InnoDB
      DEFAULT CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci;
  `);

  // Se agregaron sender_private_address y recipient_private_address
  await run(`
    CREATE TABLE IF NOT EXISTS transactions (
        id BIGINT AUTO_INCREMENT NOT NULL,
        network_id VARCHAR(10) NOT NULL,
        cyclic_counter BIGINT NOT NULL,
        block_id BIGINT NOT NULL,
        tx_hash VARCHAR(64) NOT NULL,
        sender_public_address VARCHAR(80) NOT NULL,
        recipient_public_address VARCHAR(80) NOT NULL,
        sender_private_address VARCHAR(80) NOT NULL,
        recipient_private_address VARCHAR(80) NOT NULL,
        amount DECIMAL(36,8) NOT NULL,
        gas_fee DECIMAL(36,8) NOT NULL DEFAULT 0.00000000,
        state ENUM('pending', 'processing', 'success', 'failed') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id),
        UNIQUE KEY uk_transactions_tx_hash (tx_hash),
        INDEX idx_transactions_network_id (network_id),
        INDEX idx_transactions_block_id (block_id),
        CONSTRAINT fk_tx_sender_priv FOREIGN KEY (sender_private_address) REFERENCES accounts(private_address),
        CONSTRAINT fk_tx_recipient_priv FOREIGN KEY (recipient_private_address) REFERENCES accounts(private_address)
    ) ENGINE=InnoDB
      DEFAULT CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci;
  `);

  // Asegurar la existencia de la cuenta de billetera de Gas en el sistema
/**  await run(
    `INSERT IGNORE INTO accounts (private_address, testnet_balance, mainnet_balance) VALUES (?, 1000.00000000, 1000.00000000);`, 
    [GASFEE_WALLET]
  );**/
/**  await run(
    `INSERT IGNORE INTO account_keys (private_address, private_key) VALUES (?, ?);`, 
    [GASFEE_WALLET, GASFEE_PRIVATEKEY]
  );**/
}

/**
 * Crea una nueva cuenta registrando sus claves públicas y privadas en la DB.
 */
async function createAccount() {
  await ensureTables();
  const privateAddress = generatePrivateAddress();
  const privateKey = generatePrivateKey();
  
  await run('INSERT INTO accounts (private_address, testnet_balance, mainnet_balance) VALUES (?, 0.00000000, 0.00000000);', [privateAddress]);
  await run('INSERT INTO account_keys (private_address, private_key) VALUES (?, ?);', [privateAddress, privateKey]);

  return {
    privateAddress: privateAddress,
    privateKey: privateKey
//    testnetBalance: '0.00000000',
  //  mainnetBalance: '0.00000000'
  };
}

/**
 * Autentica las credenciales comparando la combinación privada con la base de datos.
 */
async function validateCredentials(privateAddress, privateKey) {
  const row = await get('SELECT private_address FROM account_keys WHERE private_address = ? AND private_key = ?;', [privateAddress, privateKey]);
  if (!row) throw new Error('Authentication failed: Invalid private address or private key.');
  return true;
}

/**
 * Genera una dirección pública temporal con caducidad de 3 minutos asociada a una private address.
 */
async function generateTemporaryPublicAddress(privateAddress, privateKey) {
  await ensureTables();
  await validateCredentials(privateAddress, privateKey);
  const publicAddress = generatePublicAddress();
  const expiresAt = Date.now() + 180000; // Validez de 3 minutos

  await run('INSERT INTO temporary_addresses (public_address, private_address, expires_at) VALUES (?, ?, ?);', [
    publicAddress,
    privateAddress,
    expiresAt
  ]);

  return {
    publicAddress: publicAddress,
    expiresAtMs: expiresAt,
    validFor: '3 minutes'
  };
}

/**
 * Obtiene el saldo actual (mainnet/testnet) de una cuenta específica.
 */
async function getBalance(privateAddress, privateKey) {
  await ensureTables();
  await validateCredentials(privateAddress, privateKey);
  const row = await get('SELECT private_address, testnet_balance, mainnet_balance FROM accounts WHERE private_address = ?;', [privateAddress]);
  if (!row) return null;

  return {
//    privateAddress: row.private_address,
    testnetBalance: String(row.testnet_balance),
    mainnetBalance: String(row.mainnet_balance)
  };
}

/**
 * Realiza la transferencia principal e interna del cobro de Gas.
 * Ambas transacciones son registradas individualmente con sus respectivos bloques y hashes.
 */
async function transfer(txObject) {
  await ensureTables();
  const { fromAddress, fromPrivateKey, to, value, networkId } = txObject;

  const networkIdStr = String(networkId);
  if (networkIdStr !== '7357437' && networkIdStr !== '3414437') {
    return { state: 'failed', reason: 'Invalid or unsupported transaction network ID.' };
  }

  try {
    await validateCredentials(fromAddress, fromPrivateKey);
  } catch (err) {
    return { state: 'failed', reason: err.message };
  }

  const tempRecord = await get('SELECT private_address, expires_at FROM temporary_addresses WHERE public_address = ?;', [to]);
  if (!tempRecord) {
    return { state: 'failed', reason: 'Destination temporary public address does not exist or is invalid.' };
  }

  if (Date.now() > Number(tempRecord.expires_at)) {
    return { state: 'failed', reason: 'Destination temporary public address has expired (3-minute limit).' };
  }

  const recipientPrivateAddress = tempRecord.private_address;
  if (fromAddress === recipientPrivateAddress) {
    return { state: 'failed', reason: 'Self-transfer operations are not allowed.' };
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { state: 'failed', reason: 'Invalid transfer amount.' };
  }

  const isTestnet = networkIdStr === '7357437';
  const gasFee = calculateGasFee(amount);
  const totalDebit = Number((amount + gasFee).toFixed(8));

  // Generación de direcciones efímeras públicas para el emisor y para el cobro de la comisión
  const senderEphemeralPublicAddress = generatePublicAddress();
  const gasFeeRecipientPublicAddress = generatePublicAddress(); 

  return transaction(async (tx) => {
    // Bloqueo pesimista de filas en la DB para prevenir condiciones de carrera (Double Spending)
    const addressesToLock = [fromAddress, recipientPrivateAddress, GASFEE_WALLET].sort();
    
    const lockedAccounts = {};
    for (const addr of addressesToLock) {
      lockedAccounts[addr] = await tx.get('SELECT * FROM accounts WHERE private_address = ? FOR UPDATE;', [addr]);
    }

    const sender = lockedAccounts[fromAddress];
    const recipient = lockedAccounts[recipientPrivateAddress];
    const gas = lockedAccounts[GASFEE_WALLET];

    if (!sender || !recipient || !gas) return { state: 'failed', reason: 'Accounts not registered.' };

    const senderCurrentBalance = Number(isTestnet ? sender.testnet_balance : sender.mainnet_balance);
    if (senderCurrentBalance < totalDebit) return { state: 'failed', reason: 'Insufficient funds to execute transaction.' };

    // 1. DEDUCCIÓN Y ACREDITACIÓN DE FONDOS
    if (isTestnet) {
      await tx.run('UPDATE accounts SET testnet_balance = testnet_balance - ? WHERE private_address = ?;', [totalDebit, fromAddress]);
      await tx.run('UPDATE accounts SET testnet_balance = testnet_balance + ? WHERE private_address = ?;', [amount, recipientPrivateAddress]);
      await tx.run('UPDATE accounts SET testnet_balance = testnet_balance + ? WHERE private_address = ?;', [gasFee, GASFEE_WALLET]);
    } else {
      await tx.run('UPDATE accounts SET mainnet_balance = mainnet_balance - ? WHERE private_address = ?;', [totalDebit, fromAddress]);
      await tx.run('UPDATE accounts SET mainnet_balance = mainnet_balance + ? WHERE private_address = ?;', [amount, recipientPrivateAddress]);
      await tx.run('UPDATE accounts SET mainnet_balance = mainnet_balance + ? WHERE private_address = ?;', [gasFee, GASFEE_WALLET]);
    }

    // 2. REGISTRO DE LA TRANSACCIÓN DE GAS COMO UNA TRANSACCIÓN INTERNA COMPLETA
    let txRow = await tx.get('SELECT COALESCE(MAX(id),0) AS total FROM transactions FOR UPDATE;');
    let cyclicCounterGas = Number(txRow.total || 0) + 1;

    let blockRow = await tx.get('SELECT COALESCE(MAX(id),0) AS total FROM blocks FOR UPDATE;');
    let blockIdGas = Number(blockRow.total || 0) + 1;

    const seedGas = `gas-${senderEphemeralPublicAddress}-${gasFeeRecipientPublicAddress}-${gasFee}-${networkIdStr}-${cyclicCounterGas}-${blockIdGas}-${Date.now()}`;
    const txHashGas = customHash(seedGas);
    const blockHashGas = customHash(`block-gas-${txHashGas}-${blockIdGas}`);

    // Insertar la transacción interna del Gas en 'transactions'
    const insertGasTxResult = await tx.run(
      'INSERT INTO transactions (network_id, cyclic_counter, block_id, tx_hash, sender_public_address, recipient_public_address, sender_private_address, recipient_private_address, amount, gas_fee, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [networkIdStr, cyclicCounterGas, blockIdGas, txHashGas, senderEphemeralPublicAddress, gasFeeRecipientPublicAddress, fromAddress, GASFEE_WALLET, gasFee, 0.00000000, 'processing']
    );

    // Insertar bloque de la transacción de Gas en 'blocks'
    await tx.run(
      'INSERT INTO blocks (id, network_id, block_hash, previous_block_hash, transaction_id, transaction_hash, sender_public_address, recipient_public_address, sender_private_address, recipient_private_address, amount, gas_fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [blockIdGas, networkIdStr, blockHashGas, null, insertGasTxResult[0].insertId, txHashGas, senderEphemeralPublicAddress, gasFeeRecipientPublicAddress, fromAddress, GASFEE_WALLET, gasFee, 0.00000000]
    );

    await tx.run('UPDATE transactions SET state = ? WHERE tx_hash = ?;', ['success', txHashGas]);

    // 3. REGISTRO DE LA TRANSACCIÓN PRINCIPAL (Monto transferido al destino)
    txRow = await tx.get('SELECT COALESCE(MAX(id),0) AS total FROM transactions FOR UPDATE;');
    const cyclicCounterMain = Number(txRow.total || 0) + 1;

    blockRow = await tx.get('SELECT COALESCE(MAX(id),0) AS total FROM blocks FOR UPDATE;');
    const blockIdMain = Number(blockRow.total || 0) + 1;

    const seedMain = `${senderEphemeralPublicAddress}-${to}-${amount}-${networkIdStr}-${cyclicCounterMain}-${blockIdMain}-${Date.now()}`;
    const txHashMain = customHash(seedMain);
    const blockHashMain = customHash(`block-${txHashMain}-${blockIdMain}`);

    const insertMainTxResult = await tx.run(
      'INSERT INTO transactions (network_id, cyclic_counter, block_id, tx_hash, sender_public_address, recipient_public_address, sender_private_address, recipient_private_address, amount, gas_fee, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [networkIdStr, cyclicCounterMain, blockIdMain, txHashMain, senderEphemeralPublicAddress, to, fromAddress, recipientPrivateAddress, amount, gasFee, 'processing']
    );

    await tx.run(
      'INSERT INTO blocks (id, network_id, block_hash, previous_block_hash, transaction_id, transaction_hash, sender_public_address, recipient_public_address, sender_private_address, recipient_private_address, amount, gas_fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [blockIdMain, networkIdStr, blockHashMain, null, insertMainTxResult[0].insertId, txHashMain, senderEphemeralPublicAddress, to, fromAddress, recipientPrivateAddress, amount, gasFee]
    );

    await tx.run('UPDATE transactions SET state = ? WHERE tx_hash = ?;', ['success', txHashMain]);
    
    // Eliminación de la dirección temporal utilizada
    await tx.run('DELETE FROM temporary_addresses WHERE public_address = ?;', [to]);

    // La respuesta devuelta al usuario omite estrictamente las direcciones privadas
    return {
      state: 'success',
      txHash: txHashMain,
      gasTxHash: txHashGas, // Hash único de la transacción de comisión de gas registrada
      blockId: blockIdMain,
      networkId: networkIdStr,
      senderPublicAddress: senderEphemeralPublicAddress,
      recipientPublicAddress: to,
      amount: amount,
      gasFee: gasFee
//      totalDebited: totalDebit
    };
  });
}

// Modificado: Excluye sender_private_address y recipient_private_address de los resultados
async function getTransaction(txHash) {
  await ensureTables();
  const row = await get(
    'SELECT t.id, t.network_id, t.cyclic_counter, t.block_id, t.tx_hash, t.sender_public_address, t.recipient_public_address, t.amount, t.gas_fee, t.state, t.created_at, b.block_hash FROM transactions t LEFT JOIN blocks b ON b.transaction_hash = t.tx_hash WHERE t.tx_hash = ?;',
    [txHash]
  );
  if (!row) return null;

  return {
    id: row.id,
    networkId: row.network_id,
    cyclicCounter: row.cyclic_counter,
    blockId: row.block_id,
    txHash: row.tx_hash,
    senderPublicAddress: row.sender_public_address,
    recipientPublicAddress: row.recipient_public_address,
    amount: String(row.amount),
    gasFee: String(row.gas_fee),
    state: row.state,
    createdAt: row.created_at,
    blockHash: row.block_hash
  };
}

// Modificado: Excluye sender_private_address y recipient_private_address de los resultados
async function getBlock(blockId) {
  await ensureTables();
  const row = await get('SELECT id, network_id, block_hash, previous_block_hash, transaction_id, transaction_hash, sender_public_address, recipient_public_address, amount, gas_fee, created_at FROM blocks WHERE id = ?;', [blockId]);
  if (!row) return null;

  return {
    id: row.id,
    networkId: row.network_id,
    blockHash: row.block_hash,
    previousBlockHash: row.previous_block_hash,
    transactionId: row.transaction_id,
    transactionHash: row.transaction_hash,
    senderPublicAddress: row.sender_public_address,
    recipientPublicAddress: row.recipient_public_address,
    amount: String(row.amount),
    gasFee: String(row.gas_fee),
    createdAt: row.created_at
  };
}

/**************
async function addressGetInf(address_get) {

const address_get = "";

const rows = await get('SELECT network_id,block_hash,block_id,sender_public_address,recipient_public_address,amount,gas_fee,state,created_at
FROM transactions WHERE recipient_public_address = ? AND sender_public_address = ?'), [address_get];

}
**********/

/***
async function transactionAddress(address_get) { 
    // Eliminamos la redeclaración de address_get
    const query = `
        SELECT network_id, block_hash, block_id, sender_public_address, 
               recipient_public_address, amount, gas_fee, state, created_at 
        FROM transactions 
        WHERE recipient_public_address = ? AND sender_public_address = ?
    `;

    // Pasamos los parámetros dentro del paréntesis de la función get
    // Nota: Tu consulta pide DOS parámetros (recipient y sender), 
    // así que añadí 'address_get' dos veces en el arreglo.
    const rows = await get(query, [address_get, address_get]); 

    return rows || null; // Retornamos las filas obtenidas
}
***/

/********
//const mysql = require('mysql2/promise');

// Asumiendo que 'connection' o 'pool' es tu instancia de conexión de mysql2
async function transactionAddress(address_get) {
  
//const address_get = "";

  const query = `
        SELECT 
            network_id, 
            block_id, 
            sender_public_address, 
            recipient_public_address, 
            amount, 
            gas_fee, 
            state, 
            created_at 
        FROM transactions 
        WHERE recipient_public_address = ? 
           OR sender_public_address = ?
    `;

    // mysql2 devuelve un array [rows, fields]. Desestructuramos para obtener solo 'rows'.
    // Cambié el AND por OR en la consulta, asumiendo que buscas transacciones involucradas con esa dirección.
    const [rows] = await connection.execute(query, [address_get, address_get]);
    
    // Si no hay resultados, rows será un array vacío [].
    return {

    network: rows[0].network_id,
    block: rows[0].block_id,
    address_transfer: rows[0].addresssender_public_address,
    address_deposit: rows[0].recipient_public_address,
    deposit: rows[0].amount,
    gas_fee: rows[0].gas_fee,
    status:  rows[0].state,
    date: rows[0].created_at
};

}
*****/

/****
// const mysql = require('mysql2/promise'); 

async function transactionAddress(address_get) {
    const query = `
        SELECT 
            network_id, 
            block_id, 
            sender_public_address, 
            recipient_public_address, 
            amount, 
            gas_fee, 
            state, 
            created_at 
        FROM transactions 
        WHERE recipient_public_address = ? OR sender_public_address = ?
    `;

    // Desestructuramos para obtener solo las filas ('rows')
    const rows = await get(query, [address_get, address_get]);

    // Si no hay datos (array vacío), retornamos null
    if (rows) {
        return null;
    }

    // Si hay datos, mapeamos y retornamos el primer registro
    const firstRow = rows;
    
    return {
        network: rows.network_id,
        block: rows.block_id,
        address_transfer: rows.sender_public_address, // Corregido el nombre de la propiedad
        address_deposit: rows.recipient_public_address,
        deposit: rows.amount,
        gas_fee: rows.gas_fee,
        status: rows.state,
        date: rows.created_at
    };
}
****/

//const mysql = require('mysql2/promise');
/****
async function transactionAddress(address_get) {

await ensureTables();

  const query = `
    SELECT 
      network_id, 
      block_id, 
      sender_public_address, 
      recipient_public_address, 
      amount, 
      gas_fee, 
      state, 
      created_at 
    FROM transactions 
    WHERE recipient_public_address = ? OR sender_public_address = ?
  `;

  // Asegúrate de que la función 'get' esté bien definida en tu código y use 'connection.execute(query, params)'
  const rows = await get(query, [address_get, address_get]);

  // 1. CORRECCIÓN: Si 'rows' no existe o está vacío (length === 0), retornamos null
  if (!rows || rows.length === 0) {
    return null || "undefinided";
  }

  // 2. CORRECCIÓN: Tomamos la primera fila del array resultante
  const firstRow = rows[0];

  // 3. CORRECCIÓN: Mapeamos usando 'firstRow' en lugar de 'rows' (que es la lista completa)
  return {
    network: firstRow.idx_blocks_network_id,
    block: firstRow.idx_blocks_transaction_hash,
    address_transfer: firstRow.sender_public_address,
    address_deposit: firstRow.recipient_public_address,
    deposit: firstRow.amount,
    gas_fee: firstRow.gas_fee,
    status: firstRow.state,
    date: firstRow.created_at
  };
}
***/

//const mysql = require('mysql2/promise');

/**
 * Consulta las transacciones vinculadas a una dirección pública específica.
 */
async function transactionAddress(address_get) {
  const query = `
    SELECT 
      network_id, 
      block_id, 
      sender_public_address, 
      recipient_public_address, 
      amount, 
      gas_fee, 
      state, 
      created_at 
    FROM transactions 
    WHERE recipient_public_address = ? OR sender_public_address = ?
  `;

  // Se asume que 'get' ejecuta: const [rows] = await connection.execute(query, [address_get, address_get]);
  const rows = await get(query, [address_get, address_get]);

  // 1. Si no hay resultados o la lista está vacía, retornamos un array vacío (o null si lo prefieres)
  if (!rows || rows.length === 0) {
    return [];
  }

  // 2. Mapeamos TODAS las filas encontradas para devolver el historial completo de la dirección
  return {
    network: rows.network_id,
    block: rows.block_id,
    address_transfer: rows.sender_public_address,
    address_deposit: rows.recipient_public_address,
    deposit: rows.amount, // En tu tabla es DECIMAL(36,8)
    gas_fee: rows.gas_fee, // En tu tabla es DECIMAL(36,8)
    status: rows.state,    // En tu tabla es un ENUM('pending', 'processing', 'success', 'failed')
    date: rows.created_at  // En tu tabla es TIMESTAMP
  };
}

module.exports = {
  ensureTables,
  createAccount,
  generateTemporaryPublicAddress,
  getBalance,
  transfer,
  getTransaction,
  getBlock,
  calculateGasFee,
  transactionAddress
};

