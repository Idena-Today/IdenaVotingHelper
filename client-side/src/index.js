// import _ from 'lodash';
const bip39 = require("bip39");
// const crypto = require("crypto");
// const eccrypto = require("eccrypto");

const {
  DerivableKey,
  version: derivableKeyVersion
} = require("./DerivableKey");
const { VotingTransaction } = require("./VotingTransaction");

const utils = require("./utils");

const TEST_SEED_HEX =
  "95a7ecb56bda5eba808eec2407b418002b824c6c1cb159ec44b8371405629f8429419e98e1b67fc6367368f5d82871a501bbc655a62d31e8391411d7a6e74b86";
const DEFAULT_PASSWORD = "DNA_Vote";

const MOTION_ID = 1; // hardcoded motion id for the time being
const MOTION_TXID = "ffffff"; // hardcoded motion txid for the time being
const MOTION_ADDRESS = "0x000000000000000000000000000000"; // hardcoded motion address for the time being

// TODO: to be used to check whether the related action is allowed. (hardcoded for first vote)
const START_VOTE_TIMESTAMP = 1569931200; // from START_VOTE_TIMESTAMP to END_VOTE_TIMESTAMP user can send a vote
const END_VOTE_TIMESTAMP = 1572609600; // from END_VOTE_TIMESTAMP to END_REVEAL_TIMESTAMP user can reveal their votes
const END_REVEAL_TIMESTAMP = 1573387200;

const tabsActiveClasses = ["hover:bg-gray-300", "border-b-2", "bg-gray-400"];
const tabsClasses = ["bg-gray-200", "hover:bg-gray-300"];

/**
 * Utility to display error/warning message
 * @param {string} id of the field
 * @param {'error'|'message'|'warning'} type
 * @param {boolean} show
 */

function displayMessage(id, type, show = true) {
  const el = document.querySelector(`#${id}-${type}`);
  if (el) {
    if (show) el.classList.remove("hidden");
    else el.classList.add("hidden");
  }
}

function getTabsContent(transaction, seed, address, aes_key, voting_key, test_vote) {
  console.log(transaction.dna_url);
  return `
    <div id="dna-url-tab" class="tab-content">
<div class="flex justify-start mt-4" style="margin-bottom:10px;">
<button class="text bg-purple-200 font-bold text-purple-800 px-2 rounded">Your vote: ${transaction.amount} DNA for option ${test_vote}</button>
<!-- button class="text bg-purple-200 font-bold text-purple-800 px-2 rounded">Reveal Vote(s) for ${address}</button -->
</div>
    Send the following DnaUrl from the related wallet
    <textarea id="dna-url-data" readonly class="font-mono w-full text-sm overflow-x-auto bg-purple-100 text-purple-900 p-2 resize-none rounded">${
    transaction.dna_url
    }</textarea>
    <div class="flex justify-end mt-4">
    <button data-id="dna-url" class="copy text-xs hover:bg-purple-200 font-bold text-purple-800 px-2 rounded">Copy to clipboard</button>
    </div>
  </div>
  <div id="raw-txn-tab" class="hidden tab-content">
<div class="flex justify-start mt-4" style="margin-bottom:10px;">
<button class="text bg-purple-200 font-bold text-purple-800 px-2 rounded">Your vote: ${transaction.amount} DNA for option ${test_vote}</button>
<!--button class="text bg-purple-200 font-bold text-purple-800 px-2 rounded">Reveal Vote(s) for ${address}</button-->
</div>

    You can send the vote transaction by pasting the following info:
    <textarea id="raw-txn-data" readonly class="font-mono w-full text-sm overflow-x-auto bg-purple-100 text-purple-900 p-2 resize-none rounded"">
recipient: ${transaction.recipient}
amount: ${transaction.amount}
data: ${transaction.data}</textarea>
<div class="flex justify-end mt-4">
<button data-id="raw-txn" class="copy text-xs hover:bg-purple-200 font-bold text-purple-800 px-2 rounded">Copy to clipboard</button>
</div>
  </div>
  <div id="advanced-tab" class="hidden tab-content">
<div class="flex justify-start mt-4" style="margin-bottom:10px;">
<button class="text bg-purple-200 font-bold text-purple-800 px-2 rounded">Your vote: ${transaction.amount} DNA for option ${test_vote}</button>
<!--button class="text bg-purple-200 font-bold text-purple-800 px-2 rounded">Reveal Vote(s) for ${address}</button -->
</div>
    <textarea id="advanced-data" readonly class="font-mono w-full text-sm overflow-x-auto bg-purple-100 text-purple-900 p-2 resize-none rounded"">
Master 512 bits Seed: ${seed.toString("hex")}
Derivation path: m/${address}/${MOTION_TXID}
Voting key: ${utils.bytesToHex(voting_key.seed)}
AES Key: ${utils.bytesToHex(aes_key)}</textarea>
<div class="flex justify-end mt-4">
<button data-id="advanced" class="copy text-xs hover:bg-purple-200 font-bold text-purple-800 px-2 rounded">Copy to clipboard</button>
</div>
  </div>
  `;
}

let vote;

function generate_seed() {
  // user is brand new and had no prior seed, we generate and fill it for him
  const mnemonic = bip39.generateMnemonic(128); // 128 is the entropy. can be 128 to 256 - multiple of 32. 128 gives 12 words, easier for the user.
  const element = document.querySelector("#master-key");
  element.value = mnemonic;
  displayMessage("master-key", "message", true);
  displayMessage("master-key", "error", false);
}

function generate_vote() {
  // TODO: check timestamps

  const mnemonic = document.querySelector("#master-key").value;
  // block if empty or less than 12 words
  if (!mnemonic || mnemonic.split(" ").length < 12) {
    displayMessage("master-key", "error");
    return;
  }
  const valid = bip39.validateMnemonic(mnemonic);
  // mnemonic created by a BIP39 compatible tool will validate, but we have to account for other generators to be safe.
  if (!valid) {
    // If valid is false, then warn the user but go on anyway.
    displayMessage("master-key", "warning");
  }
  // console.log("Valid mnemonic:", valid);

  const address = document.querySelector("#wallet-address").value.trim().toLowerCase();
  // trim address and validate, give feedback to user if invalid
  // A valid dna address matches this regexp:
  // 0x(40 chars)
  const dnaAddressMatch = address.match(/^0x[abcdef0123456789]{40}$/);
  if (!dnaAddressMatch) {
    displayMessage("wallet-address", "error");
    return;
  }

  if (!vote) {
    displayMessage("vote", "error");
    return;
  }

  const amount = parseInt(document.querySelector("#dna-amount").value, 10);
  // Validate, make sure this is an integer. Will mostly not be the case because input field is number
  if (amount <= 0) {
    displayMessage("dna-amount", "error");
    return;
  }

  // This part is redundant, done by VotingTransaction later on, but can be useful for debug (advanced tab).
  const seed = bip39.mnemonicToSeedSync(mnemonic, DEFAULT_PASSWORD);
  const master_key = new DerivableKey(seed);
  let voting_key = master_key.derive(address).derive(MOTION_TXID);
  let aes_key = voting_key.to_aes_key();

  const voting_transaction = new VotingTransaction(
    seed,
    address,
    MOTION_ID,
    MOTION_TXID,
    MOTION_ADDRESS
  );
  const transaction = voting_transaction.get_vote_transaction(vote, amount);
  //console.log(transaction);
  let test_message = transaction["data"].split(":")[2];
  let test_key = master_key.derive(address).derive(MOTION_TXID);
  let test_vote = test_key.decrypt_vote_b64(test_message);
  // console.log("Vote:", test_vote);
  if (vote != test_vote) {
    displayMessage("vote", "Vote Integrity Error");
    return;
  }

  document.querySelector("#results-wrap").classList.remove("hidden");

  // reset tabs
  Array.from(document.querySelectorAll(".tabs")).forEach(otherTab => {
    otherTab.classList.remove(...tabsActiveClasses);
    otherTab.classList.add(...tabsClasses);
  });
  document
    .querySelector('div[data-id="raw-txn-tab"]')
    .classList.add(...tabsActiveClasses);
  document.querySelector("#result").innerHTML = getTabsContent(
    transaction,
    seed,
    address,
    aes_key,
    voting_key,
    test_vote
  );
  // COPY TO CLIPBOARD
  Array.from(document.querySelectorAll("button.copy")).forEach(btn => {
    btn.addEventListener("click", () => {
      const tAEl = document.querySelector(`textarea#${btn.dataset.id}-data`);
      tAEl.select();
      document.execCommand("copy");
    });
  });
}

function generate_reveal() {
  // TODO: mostly copy/paste from generate_vote, factorize code.

  // TODO: check timestamps

  const mnemonic = document.querySelector("#master-key").value;
  // block if empty or less than 12 words
  if (!mnemonic || mnemonic.split(" ").length < 12) {
    displayMessage("master-key", "error");
    return;
  }

  const valid = bip39.validateMnemonic(mnemonic);
  // mnemonic created by a BIP39 compatible tool will validate, but we have to account for other generators to be safe.
  if (!valid) {
    // If valid is false, then warn the user but go on anyway.
    displayMessage("master-key", "warning");
  }
  console.log("Valid mnemonic:", valid);

  const address = document.querySelector("#wallet-address").value.trim().toLowerCase();
  const dnaAddressMatch = address.match(/^0x[abcdef0123456789]{40}$/);
  if (!dnaAddressMatch) {
    displayMessage("wallet-address", "error");
    return;
  }
  // No need for option nor amount
  // TODO: (reveal) comment out the fields not required in HTML
  // This part is redundant, done by VotingTransaction later on, but can be useful for debug (advanced tab).
  const seed = bip39.mnemonicToSeedSync(mnemonic, DEFAULT_PASSWORD);
  const master_key = new DerivableKey(seed);
  let voting_key = master_key.derive(address).derive(MOTION_TXID);
  let aes_key = voting_key.to_aes_key();

  const voting_transaction = new VotingTransaction(
    seed,
    address,
    MOTION_ID,
    MOTION_TXID,
    MOTION_ADDRESS
  );
  const transaction = voting_transaction.get_reveal_transaction();
  console.log(transaction);

  document.querySelector("#results-wrap").classList.remove("hidden");

  // reset tabs
  Array.from(document.querySelectorAll(".tabs")).forEach(otherTab => {
    otherTab.classList.remove(...tabsActiveClasses);
    otherTab.classList.add(...tabsClasses);
  });
document
    .querySelector('div[data-id="raw-txn-tab"]')
    .classList.add(...tabsActiveClasses);

  document
    .querySelector('div[data-id="dna-url-tab"]')
    .classList.add(...tabsActiveClasses);

  document.querySelector("#result").innerHTML = getTabsContent(
    transaction,
    seed,
    address,
    aes_key,
    voting_key
  );
  // COPY TO CLIPBOARD
  Array.from(document.querySelectorAll("button.copy")).forEach(btn => {
    btn.addEventListener("click", () => {
      const tAEl = document.querySelector(`textarea#${btn.dataset.id}-data`);
      tAEl.select();
      document.execCommand("copy");
    });
  });
}

function component() {
  const element = document.createElement("div");

  /*
    const mnemonic = bip39.entropyToMnemonic('00000000000000000000000000000000');
    element.innerHTML = _.join(['Mnemonic', mnemonic], ' ');

    // console.log("seed");
    bip39.mnemonicToSeed('letter advice cage absurd amount doctor acoustic avoid letter advice cage above', DEFAULT_PASSWORD).then(bytes => bytes.toString('hex')).then(console.log);
    //bip39.mnemonicToSeed('letter advice cage absurd amount doctor acoustic avoid letter advice cage above', DEFAULT_PASSWORD).then(console.log);

    console.log(derivableKeyVersion);

    const master_key = new DerivableKey(utils.hexToBytes(TEST_SEED_HEX));
    console.log("Master " + master_key);
    console.log("Master seed", master_key.seed);
    console.log("Master seed h1", master_key.seed.toString('hex')); // ???
    console.log("Master seed h2", utils.bytesToHex(master_key.seed));
    const pubkey = master_key.to_pubkey()
    console.log("pubkey " + utils.bytesToHex(pubkey));
    const address_key1 = master_key.derive("Bis_test_address1");
    console.log("Seed1 " + utils.bytesToHex(address_key1.seed));
    console.log("AES1 " + utils.bytesToHex(address_key1.to_aes_key()));
    const motion_key1a = address_key1.derive("motion_1_txid_this_would_be_a_b64_encoded_string");
    console.log("Seed1a " + utils.bytesToHex(motion_key1a.seed));
    console.log("AES1a " + utils.bytesToHex(motion_key1a.to_aes_key()));
    let encrypted = motion_key1a.encrypt_vote('B', true);
    console.log("encrypted1a B" + utils.bytesToHex(encrypted));
    console.log("encrypted1a B b64", Buffer.from(encrypted).toString('base64'));
    // B 7b74501d577bc84c655bfcb3c91fc5f3  - Message e3RQHVd7yExlW/yzyR/F8w==
    encrypted = motion_key1a.encrypt_vote('A', true);
    console.log("encrypted1a A" + utils.bytesToHex(encrypted));
    console.log("encrypted1a A b64", Buffer.from(encrypted).toString('base64'));
    // A A41fea09e3f2e12886c6a24ff73c203d2 -  Message Qf6gnj8uEohsaiT/c8ID0g==
    */
  return element;
}

// TODO: harmonize ids
// TODO: (reveal) remove this and HTML if this is not required
document
  .querySelector("#btn-generate")
  .addEventListener("click", generate_seed);

const genVoteUrlButton = document.querySelector("#generate-vote-url");
if (genVoteUrlButton) genVoteUrlButton.addEventListener("click", generate_vote);

const genRevealUrlButton = document.querySelector("#generate-reveal-url");
if (genRevealUrlButton) genRevealUrlButton.addEventListener("click", generate_reveal);

// document.body.appendChild(component());


const voteAButton = document.querySelector("#btn-vote-a");
const voteBButton = document.querySelector("#btn-vote-b");

voteAButton.addEventListener("click", () => {
  vote = "A";
  // add green color to button A and remove from B
  /*
  voteAButton.classList.replace("bg-gray-200", "bg-green-400");
  voteAButton.classList.replace("hover:bg-gray-300", "hover:bg-green-500");
  voteBButton.classList.replace("bg-green-400", "bg-gray-200");
  voteBButton.classList.replace("hover:bg-green-500", "hover:bg-gray-300");
  */
  voteAButton.classList.remove("bg-gray-200");
  voteAButton.classList.remove("hover:bg-gray-300");
  voteBButton.classList.remove("bg-green-400");
  voteBButton.classList.remove("hover:bg-green-500");
  voteAButton.classList.add("bg-green-400");
  voteAButton.classList.add("hover:bg-green-500");
  voteBButton.classList.add("bg-gray-200");
  voteBButton.classList.add("hover:bg-gray-300");
  displayMessage("vote", "error", false);
});
voteBButton.addEventListener("click", () => {
  vote = "B";
  // add green color to button B and remove from A
  /*
  voteBButton.classList.replace("bg-gray-200", "bg-green-400");
  voteBButton.classList.replace("hover:bg-gray-300", "hover:bg-green-500");
  voteAButton.classList.replace("bg-green-400", "bg-gray-200");
  voteAButton.classList.replace("hover:bg-green-500", "hover:bg-gray-300");
  */
    voteBButton.classList.remove("bg-gray-200");
  voteBButton.classList.remove("hover:bg-gray-300");
  voteAButton.classList.remove("bg-green-400");
  voteAButton.classList.remove("hover:bg-green-500");
  voteBButton.classList.add("bg-green-400");
  voteBButton.classList.add("hover:bg-green-500");
  voteAButton.classList.add("bg-gray-200");
  voteAButton.classList.add("hover:bg-gray-300");

  displayMessage("vote", "error", false);
});


// add listeners to remove errors when value changes
["master-key", "wallet-address", "dna-amount"].forEach(field => {
  const el = document.querySelector(`input#${field}`);
  if (el) {
    el.addEventListener("change", () => {
      displayMessage(field, "error", false);
    });
  }
});

// TABS
const tabsWrapEl = document.querySelector("#tabs-wrap");

Array.from(tabsWrapEl.querySelectorAll(".tabs")).forEach(tabEl => {
  tabEl.addEventListener("click", () => {
    // remove current active tab
    Array.from(tabsWrapEl.querySelectorAll(".tabs")).forEach(otherTab => {
      otherTab.classList.remove(...tabsActiveClasses);
      otherTab.classList.add(...tabsClasses);
    });
    // set new active tab
    tabEl.classList.remove(...tabsClasses);
    tabEl.classList.add(...tabsActiveClasses);
    // set active div
    Array.from(document.querySelectorAll(".tab-content")).forEach(contentEl => {
      contentEl.classList.add("hidden");
    });
    document.querySelector(`#${tabEl.dataset.id}`).classList.remove("hidden");
    // set height based on content
    Array.from(document.querySelectorAll("textarea")).forEach(ta => {
      ta.style.height = ta.scrollHeight + "px";
    });
  });
});
