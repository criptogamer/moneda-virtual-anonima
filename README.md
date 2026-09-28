# moneda-virtual-anonima
Es una moneda virtual que transfiere a direcciones aleatorias temporales con un nivel de seguridad en blockchain de extremo a extremo a nivel global públicamente.



```bash

yes | pkg install mariadb && yes | pkg install nodejs && yes | pkg install git && npm i mysql2 dotenv

```



```bash
git clone https://github.com/criptogamer/moneda-virtual-anonima.git

```


```bash
cd moneda-virtual-anonima
```





<h2>Crear cuentas</h2>


```nodejs

const yengcoin = require('./index.js');

async function main() {


  try {


   console.log('--- 1. Creación de cuentas privadas ---');
    const sender = await yengcoin.createAccount();
    const recipient = await yengcoin.createAccount();

    console.log('Cuenta del Emisor:', sender);
    console.log('Cuenta del Receptor:', recipient);



process.exit(0);

} catch (err) {




console.log(err);

process.exit(1);
}





}



main();



```


```bash
nano create_accounts.js
```

```bash
node create_accounts.js
```


<h2>Crear dirección temporal</h2>

```nodejs






const yengcoin = require('./index.js');

async function main() {
  try {









 


const privateAddress = "";
const privateKey = "";

    console.log('\n--- 2. Generación de dirección pública de un solo uso (Válida por 3 minutos) ---');
    const tempPaymentAddress = await yengcoin.generateTemporaryPublicAddress(
      privateAddress,
      privateKey
    );
    console.log('Dirección Pública Temporal:', tempPaymentAddress);




process.exit(0);
} catch (err) {




console.log(err);



process.exit(1);
}



}
main();


```



```bash
nano create_temp_address.js

```


```bash
node create_temp_address.js

```



<h2>Transacciones</h2>

```nodejs

const yengcoin = require('./index.js');

async function main() {
  try {


    console.log('\n--- 3. Ejecución de Transferencia con Privacidad y Hash Propietario ---');
    const testnetNetworkId = 7357437;

    const tx = {
      fromAddress: "",
      fromPrivateKey: "",
      to: "",
      value: 0.00003000,
      networkId: testnetNetworkId
    };

    const txResult = await yengcoin.transfer(tx);
    console.log('Resultado de la Transferencia:', txResult);



process.exit(0);



} catch (err) {




console.log(err);




process.exit(1);


}




}
main();

```


```bash
nano transaction.js
```

```bash
node transaction.js

```


<h2>Obtener balance</h2>


```nodejs





const yengcoin = require('./index.js');




async function get_balance() {

try {

const addressPrivate = "";


const privateKey = "";








const balance = await yengcoin.getBalance(addressPrivate, privateKey);


console.log(balance);





process.exit(0);
} catch (err) {

console.log(err);

process.exit(1);



}







}
get_balance();



```


```bash
nano get_balance.js

```

```bash

node get_balance.js

```



<h2>Obtener detalles de transacción por direccion temporal</h2>



```nodejs





const yengcoin = require('./index.js');



async function ejecutarBusqueda() {
    try {
        const direccionABuscar = ''; // Reemplaza con una dirección real
        
        // Llamada a la función esperando el resultado
        const historial = await yengcoin.transactionAddress(direccionABuscar);
        
        console.log('Historial de transacciones obtenido:', historial);
    } catch (error) {
        console.error('Error al obtener las transacciones:', error);
    }
}

ejecutarBusqueda();



```


```bash

nano address_temp_details_transaction.js

```


```bash

node address_temp_details_transaction.js

```





<h2>Obtener detalles por hash</h2>


```nodejs







const yengcoin = require('./index.js');

async function main() {
  try {






   



      console.log('\n--- 4. Consulta de detalles de la transacción ---');
      const txDetails = await yengcoin.getTransaction("Hash_id");
      console.log('Información Pública de la Transacción:', txDetails);






process.exit(0);

} catch (err) {


console.log(err);



process.exit(1);

}


}



```



```bash

nano details_transaction_hash.js

```


```bash

node details_transaction_hash.js

```




<h2>Obtener detalles por bloque</h2>



```nodejs





const yengcoin = require('./index.js');

async function main() {
  try {













      console.log('\n--- 5. Consulta de detalles del bloque ---');
      const blockDetails = await yengcoin.getBlock(txResult.blockId);
      console.log('Información Pública del Bloque:', blockDetails);





} catch (err) {




console.log(err);





}



}


```



```bash

nano get_inf_block.js

```



```bash

node get_inf_block.js


```
