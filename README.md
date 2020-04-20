# Idena Voting Repository


This repo is there to spec and document to various possible voting protocols for use on Idena Blockchain.

The protocols listed there are open, free to use, and try to be well documented and tested.

The goal is to avoid multiple incompatible implementations from various developpers, and rely instead of a solid and future proof set of protocols that will be cross compatible, no matter the client app you can use.

Common and well documented protocols are also more likely to be picked up by the official devs and be used in the wallet itself. 


The protocols we describe here

- allow any number of possible motions
- can work for simple poll with clear text votes
- work for "skin in the game" votes with hidden votes until revealed
- can be restricted or not to some address classes (valid, human, all)
- Use on chain data, provably fair.
- public and open source protocol and implementation with test vectors coming, can be integrated into any wallet or client app, not proprietary
- in addition, we introduce DnaUrl - a safe format for transfering transaction data - data payload included - between different apps in a safe way.
  [DNA URL specs and js lib](https://github.com/Idena-Today/DnaUrl)


## Pre-requisite

We want the voting protocols to be non centralized, non proprietary, and cross implementation compatible.  
Idena supports an optional "data" field that can be used to attach a payload to any transaction.

Core idea of voting is to send transactions - with or without dna, with or without data - to specific addresses, 
an address being related to a specific motion or a specific motion option.

The protocols specified here allow multiple use case to be implemented in a coherent and compatible way.  
They are open to discussion: goal is not to impose one specific protocol, but to provide a clean starting base that everyone could use, build upon, and that will age well.

As such, some rules can be defined to id and sort among the different options.  
All the options described here can co-exist, they are not exclusive.

## Simple voting/poll, option A

No need for data, uses addresses as selector.

A motion consist of 
- a title
- a description
- a set of options
- a start date (timestamp)
- a deadline (timestamp)

Every option consist of
- a text
- a dedicated address, created on purpose for that motion-option

Vote is done by sending 0 or DNA amount to the motion-option address you support.

Results 
- Results can be count(votes) or sum(dna sent) per option

Options
- vote can be restricted to some categories (only valid ids, only humans)
- humans can be given more weight aso..

The specifics of the vote count have to be detailled with the initial motion.

## Simple voting/poll, option B

No DNA sent, single address, use of data.

A motion consist of 
- a title
- a description
- an id (say "1")
- a set of options
- a start date (timestamp)
- a deadline (timestamp)
- a dedicated address, created on purpose for that motion

Every option consist of
- a text
- a code (say "A" for option A)

Vote is done by sending 0 DNA amount to the motion address, with "poll:1:A" as data.  
- 1 is the poll id - Allow to make sure it fits the dedicated address
- A is the option you vote for
- poll prefix allows to make sure what voting scheme is used.

Results 
- Results is count(option votes)

Options
- vote can be restricted to some categories (only valid ids, only humans)
- humans can be given more weight aso..

The specifics of the vote count have to be detailled with the initial motion.


## Skin in the game voting protocol

This protocol allows for a more complex "skin in the game" voting protocol.  
It originally comes from the Bismuth team, and you're invited to read about it there https://hypernodes.bismuth.live/?p=778
to get a sense of what it achieves and how it solves several of blockchain governance issues.

With that scheme, you vote by sending DNA + data.  
The DNA you send is public, that data (your vote) is encrypted. It's a secret vote. 

So the total voting stakes are known, not the repartition.
In a second step, votes are revealed, and some DNA is sent back (again, see details on the post)

This repo contains a reference implementation and client side code for Idena "Skin in the game" Voting Protocol.

For that protocol, 

A motion consist of 
- a title
- a description
- an id (say "1")
- a set of options
- a start date (timestamp)
- a deadline for voting(timestamp)
- a deadline for disclosing vote (timestamp)
- a dedicated address, created on purpose for that motion

Every option consist of
- a text
- a code (say "A" for option A)

Vote is done by sending 0 DNA amount to the motion address, with "vote:1:encrypted" as data.    
- 1 is the motion id - Allows to make sure it fits the dedicated address
- encrypted is the option you vote for, but encrypted with a disposable key you only have.
- poll prefix allows to make sure what voting scheme and step is used.

Revealing is done by sending 0 DNA amount to the motion you support, with "reveal:1:key" as data.    
- 1 is the motion id - Allow to make sure it fits the dedicated address
- key is the disposable key that was used for the vote encryption, not to be used again.
- reveal prefix allows to make sure what voting scheme and step is used.


Results 
- Results is count(option amount)

Options
- vote can be restricted to some categories (only valid ids, only humans)
- In the bismuth approachs, losers get their stakes back. (this has important consequences)

The specifics of the vote count have to be detailled with the initial motion.


#### Skin in the game Voting Helper (Demo)

See the [Current voting helper POC](https://idena-today.github.io/IdenaVotingHelper/client-side/dist/index.html)


#### Skin in the game Reference

Skin in the game voting protocol is based on [Bismuth Voting](https://github.com/bismuthfoundation/Bismuth-Voting) by the Bismuth Team.  
reference (kept from Original Bismuth Voting)

- [The Bismuth Governance Shift, Part 1](https://hypernodes.bismuth.live/?p=778)
- [The Bismuth Governance Shift, Part 2](https://hypernodes.bismuth.live/?p=791)
- [BGV-01: Bismuth Governance Vote #1](https://hypernodes.bismuth.live/?p=820)


## Motion list provider

For these motions to behave well, motion lists providers have to be setup.

A motion is no more than a json file containing the required data for a motion (see above, required data for every protocol type)

We can imagine there will be several motion sources. Can be official devs motions, community motions, private polls...  
Anyone could publish a json and run a vote with these protocols and provided tools.

As this could quickly lead to a plethora of motions, some semi centralized motion source could be setup.  
This can be as simple as a github repo fed with PRs, an API on a given website (relaying the github repo), or more limited and authentified lists for official dev motions for instance.  


# Roadmap

- list compatible tools
- help other devs to implement/integrate these protocols
- improve helpers and integrate voting into the helpers
- motion stats dashboards
- motion list provider management tools 
