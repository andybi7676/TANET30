const mongoose = require('mongoose')
const Schema = mongoose.Schema

const EventSchema = new Schema({
	admin: {
    type: Schema.Types.ObjectId,
    ref: 'User',
		required: true
	},
	name: {
		type: String,
		required: true
  },
  begin: {
    type: Number,
    required: true
  },
  end: {
    type: Number,
    required: true
  },
  participant: {
	  type: [{type:  Schema.Types.ObjectId, ref: 'User'}],
	  required: true
  },
  password: {
    type: String,
    required: false
  }
});

// Creating a table within database with the defined schema
const Event = mongoose.model('Event', EventSchema);

// Exporting table for querying and mutating
module.exports = Event;