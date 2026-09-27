# moneda-virtual-anonima
Es una moneda virtual que transfiere a direcciones aleatorias temporales con un nivel de seguridad en blockchain de extremo a extremo.


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






<h2>Crear dirección temporal</h2>

```nodejs






const yengcoin = require('./index.js');

async function main() {
  try {



/****
****/







 


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





<h2>Transferencias</h2>

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







<h2>Obtener información de transacción por direccion temporal</h2>



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








<h2>Obtener información por hash</h2>


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
