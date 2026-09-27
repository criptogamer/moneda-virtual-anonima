# moneda-virtual-anonima
Es una moneda virtual que transfiere a direcciones aleatorias temporales con un nivel de seguridad en blockchain de extremo a extremo.




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
