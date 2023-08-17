var express = require("express");
var router = express.Router();
var admin = require("firebase-admin");
var serviceAccount = require("./credential.json");
const Cryptr = require("cryptr");
const cors = require("cors");

const cryptr = new Cryptr("sagor6060sagorweb$bank", {
  pbkdf2Iterations: 10000,
  saltLength: 10,
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

router.use(cors());


router.post("/verifyCard", async function (req, res, next) {
  var uid = req.body.card;

  if (!uid) {
    res.status(400).send("Bad Request");
    return;
  }

  try {
    var userRecord = await admin.auth().getUser(uid);
    res.status(200).json({
      token: cryptr.encrypt(
        JSON.stringify({
          uid: uid,
          email: userRecord.email,
          passwordVerified: 0,
          time: Date.now(),
        })
      ),
      email: userRecord.email,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send("Bad Request");
  }
});

router.post("/addCard", async function (req, res, next) {
  var token = req.body.token;
  var password = req.body.password;

  if (!token || !password) {
    res.status(400).send("Bad Request");
    return;
  }

  try {
    var data = JSON.parse(cryptr.decrypt(token));

    if(Date.now() - data.time > 1000*60*5){
      res.status(403).send("Token Expired");
      return;
    }


    const resp = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyAlQWxPGEuKmDLXl7qexS94iuBOf3FZaXM", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        password: password,
      }),
    });

    const respData = await resp.json();

    if(respData.error){
      res.status(403).send("Wrong Password");
      return;
    }

    res.status(200).json({
      token: cryptr.encrypt(
        JSON.stringify({
          uid: data.uid,
          email: data.email,
          passwordVerified: 1,
          time: Date.now(),
        })
      ),
    });

  }
  catch (error) {
    console.log(error);
    res.status(400).send("Bad Request");
  }
});

router.post("/transaction", async function (req, res, next) {

  const fromToken = req.body.fromToken;
  const toToken = req.body.toToken;
  const amount = req.body.amount;

  console.log(fromToken, toToken, amount);

  if(!fromToken || !toToken || !amount){
    res.status(400).send("Bad Request: Missing Data");
    return;
  }

  let fromData;
  let toData;
  try{
    fromData = JSON.parse(cryptr.decrypt(fromToken));
    toData = JSON.parse(cryptr.decrypt(toToken));

    if(fromData.passwordVerified != 1 || toData.passwordVerified != 1){
      res.status(403).send("Unauthorized");
      return;
    }
  }

  catch(error){
    console.log(error);
    res.status(401).send("Bad Request: Invalid Token");
    return;
  }


  const from = fromData.uid;
  const fromEmail = fromData.email;

  const to = toData.uid;
  const toEmail = toData.email;

  
  if (!from || !to || !amount || !fromEmail || !toEmail) {
    res.status(400).send("Bad Request: missing email or uid");
    return;
  }

  try {
    var fromRecord = await admin.auth().getUser(from);
    var toRecord = await admin.auth().getUser(to);

    if (fromRecord.email != fromEmail || toRecord.email != toEmail) {
      res.status(400).send("Bad Request: email and uid mismatch");
      return;
    }

    const fromDoc = await admin
      .firestore()
      .doc("users/" + from)
      .get();

    if (fromDoc.data().balance < amount) {
      res.status(405).send("Insufficient Balance");
      return;
    }

    const toDoc = await admin
      .firestore()
      .doc("users/" + to)
      .get();

    await admin
      .firestore()
      .doc("users/" + from)
      .update({
        balance: fromDoc.data().balance - amount,
      });

    await admin
      .firestore()
      .doc("users/" + to)
      .update({
        balance: toDoc.data().balance + amount,
      });

    await admin
      .firestore()
      .collection("users/" + from + "/transactions")
      .add({
        name: toDoc.data().name,
        to: to,
        amount: amount,
        date: new Date().getTime(),
        type: "withdraw",
      });

    await admin
      .firestore()
      .collection("users/" + to + "/transactions")
      .add({
        name: fromDoc.data().name,
        amount: amount,
        from: from,
        date: new Date().getTime(),
        type: "deposit",
      });

    res.status(200).send("Transaction Successful");
  } catch (error) {
    console.log(error);
    res.status(400).send("Bad Request: Internal Error");
  }
});


module.exports = router;
