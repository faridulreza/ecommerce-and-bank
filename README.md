# ecommerce-and-bank
A shop that is capable of supporting product upload and simulates product delivery and cancellation.
The transactions are processed by the bank project. User and supplier needs to create a bank account in the bank project before
opening an account in the shop. The shop will ask for the bank detail before any of the products can be bought or supplied.

# Add firebase
- Create two firebase project with firestore, realtime database and Email authentication enabled.
- The bank/backend requires admin service account info of your firebase project. Add your credential to `bank/backend/routes/credential.json`
- Add firebase initialization code to `shop/frontend/src/firebase/firebase.js`
- Add firebase initialization code to `bank/frontedn/src/firebase.js`

# Run
Start the bank backend
`cd bank/backend && npm start`

Start the bank frontend
`cd bank/frontend && npm run dev`

Start the Shop
`cd shop/frontend && npm start`
