const express = require("express");
const router = express.Router();
const Event = require("../models/event");
const User = require("../models/user");

router.post('/', async (req, res) => {
  let d = new Date();
  if(!req.isLogin) {
    console.log(`[${d.toLocaleDateString()}, ${d.toLocaleTimeString()}] Create event failed: Not login`);
    res.status(401).send("Not logged in");
    return;
  }
  const { name, begin, end, password } = req.body;
  let admin = req.user.id;
  if(!name || !begin || !end || !admin) {
    res.status(400).send("Missing field");
    return;
  }
  if(req.user.group === 'user') {
    res.status(403).send("Operation not allowed");
    return;
  }
  if(req.user.group === 'root' && req.body.admin) {
    admin = req.body.admin;
  }

  const exists = await Event.findOne({name}, (err, event) => {
    if(event) return true;
    else if(err) {
      errHandler(err, res);
      return true;
    }
    return false;
  })
  if(exists) {
    res.status(400).send("Event name already exists");
    return;
  }

  const newEvent = Event({admin, name, begin, end, participant: [], password});
  const done = newEvent.save()
  .then(_ => true)
  .catch(err => errHandler(err, res));

  if(done) {
    let d = new Date();
    console.log(`[${d.toLocaleDateString()}, ${d.toLocaleTimeString()}] Create Event success: ${name} by ${req.user.name}`);
    res.status(200).send("Create event success");
  }
  else res.status(500).send("Create event failed");
  return;
})

router.get('/', (req, res) => {
  const projection = "_id admin name begin end participant";
  const userProjection = "_id name email";
  let timeRange = null;
  if(req.query.begin && req.query.end) {
    timeRange = {begin: {$gte: req.query.begin}, end: {$lte: req.query.end}};
  }
  if(req.query.id) {
    Event.findById(req.query.id)
    .populate('admin', userProjection)
    .populate({
      path: 'participant',
      select: userProjection,
      populate: { 
        path: 'participant'
      }
    })
    .exec((err, event) => {
      if(err) errHandler(err, res);
      else if(!event) res.status(404).send("Not found");
      else {
        if(req.user && req.user.id === String(event.admin)) {
          res.status(200).send(event.toObject());
        }
        else {
          res.status(200).send({...event.toObject(), password: ""});
        }
      }
    })
  }
  else if(req.query.name) {
    let query = {name: req.query.name};
    if(timeRange) query = {...query, ...timeRange};
    Event.findOne(query, projection)
    .populate('admin', userProjection)
    .populate({
      path: 'participant',
      select: userProjection,
      populate: { 
        path: 'participant'
      }
    })
    .exec((err, event) => {
      if(err) errHandler(err, res);
      else if(!event) res.status(404).send("Not found");
      else res.status(200).send(event.toObject());
    })
  }
  else if(req.query.admin) {
    let query = {admin: req.query.admin};
    if(timeRange) query = {...query, ...timeRange};
    Event.find(query, projection)
    .populate('admin', userProjection)
    .exec((err, events) => {
      if(err) errHandler(err, res);
      else res.status(200).send(events);
    })
  }
  else {
    Event.find({}, projection)
    .populate('admin', userProjection)
    .exec((err, events) => {
      if(err) errHandler(err, res);
      else res.status(200).send(events);
    })
  }
})

const participate = async (res, now, event, userId) => {
  const beginDate = new Date(event.begin);
  if(
    beginDate.getFullYear() !== now.getFullYear() || 
    beginDate.getMonth() !== now.getMonth() || 
    beginDate.getDate() !== now.getDate()
  ) {
    res.status(400).send("Event is ended or is not started yet");
    return;
  }
  const user = await User.findById(userId)
  .then(user => {
    if(user) return user;
    else return false;
  })
  .catch(_ => false);
  if(user === false) {
    res.status(400).send("User does not exist");
    return;
  }
  const joined = event.participant.find(_user => String(_user) === String(userId));
  if(joined) {
    res.status(400).send("Already joined event");
    return;
  }

  await Event.updateOne({_id: event._id}, {$push: {participant: userId}});
  res.status(200).send({id: user._id, name: user.name});
}

router.post('/join', async (req, res) => {
  let d = new Date();
  if(!req.isLogin) {
    console.log(`[${d.toLocaleDateString()}, ${d.toLocaleTimeString()}] Join event failed: Not login`);
    res.status(401).send("Not logged in");
    return;
  }

  const { eventId, password } = req.body;
  const event = await Event.findById(eventId)
  .then(event => event)
  .catch(_ => false);
  if(!event) {
    res.status(400).send("Event does not exist")
    return;
  }
  if(password !== event.password) {
    res.status(401).send("Not allowed to join");
    return;
  }

  participate(res, d, event, req.user.id);
})

router.post('/addParticipant', async (req, res) => {
  let d = new Date();
  if(!req.isLogin) {
    console.log(`[${d.toLocaleDateString()}, ${d.toLocaleTimeString()}] Add participant failed: Not login`);
    res.status(401).send("Not logged in");
    return;
  }

  const { eventId, userId } = req.body;
  if(!eventId || !userId) {
    res.status(400).send("Missing field!");
    return;
  }
  const event = await Event.findById(eventId, (err, event) => {
    if(event) return event;
    else if(err) {
      errHandler(err, res);
      return false;
    }
    else return false;
  })
  if(!event) {
    res.status(400).send("Event does not exist")
    return;
  }
  if(req.user.id !== String(event.admin)) {
    res.status(401).send("You are not admin");
    return;
  }

  participate(res, d, event, userId);
})

const errHandler = (err, res) => {
  console.error(err);
  res.status(500).send("Server error");
}

module.exports = router;