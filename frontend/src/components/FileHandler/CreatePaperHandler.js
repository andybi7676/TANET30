import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Papa from 'papaparse';
import { Icon, Segment, Header, Loader, Dimmer } from 'semantic-ui-react';
import PropTypes from 'prop-types';
import { BACKEND } from '../../config';

const [INIT, PARSING, CREATING, DONE, ERROR] = [0,1,2,3,4];

const CreatePaperHandler = ({content}) => {
  const [status, setStatus] = useState(INIT);
  const [count, setCount] = useState(0);
  const [errMsg, setErrMsg] = useState("");
  const [invalidEvents, setInvalidEvents] = useState([]);
  const {token} = useSelector(state => state.user);

  const create = async (event) => {
    const _event = {
      eventName: event[0],
      paperGroup: event[1],
      paperId: event[2],
      paperTitle: event[3],
      paperAuthors: event[4],
      paperContent: [...event.slice(5)].join()
    }
    return await fetch(
      BACKEND+"/event/addPaper",
      { 
        method: "POST", 
        body: JSON.stringify(_event),
        headers: {'authorization': token, 'content-type': "application/json"}
      }
    )
    .then(res => {
      if(res.status !== 200){
        res.text()
        .then(errMsg => console.error(`Got ${res.status} for event:`, _event, `, Response: ${errMsg}`))
        .catch( err => console.error(err));
        return false;
      }
      else {
        setCount(count+1);
        return true;
      }
    })
    .catch(err => {
      console.error(err);
      return false;
    })
  }

  const createAll = (events, newInvalidEvents = []) => {
    if(count !== 0) setCount(0);
    Promise.all(events.map(event => create(event)))
    .then(result => {
      setStatus(DONE);
      setCount(result.reduce((prevValue, success) => prevValue + (success?1:0), 0));
      let errEvents = result.reduce((errEvents, success, idx) => {
        if(!success) return [...errEvents, idx];
        else return errEvents;
      }, []).map(eventIdx => events[eventIdx]);
      setInvalidEvents([...invalidEvents, ...newInvalidEvents, ...errEvents]);
    })
  }

  if (status === INIT) {
    setStatus(PARSING);
    // Parse the csv string using Papa Parser
    Papa.parse(content, {
      complete: (results) => {
        if(results.errors.length > 0) {
          console.error(results.errors);
          setStatus(ERROR);
          setErrMsg("Parsing Error! See console for more info.")
        }
        else {
          setStatus(CREATING);
          const events = [];
          const newInvalidEvents = [];
          for(let i = 0;i < results.data.length;i++) {
            const event = results.data[i];
            if(i === 0) {
              const check = ["event name", "paper id", "paper title", "paper authors", "paper group", "paper content"];
              const lowerArr = event.map(field => field.toLowerCase());
              let same = true;
              for(let field = 0;field < 6;field++) {
                same = same && lowerArr[field].trim() === check[field];
              }
              if(same) continue;
            }
            // Check invalid row (except empty row)
            if(event.length === 1 && event[0] === "") continue;
            events.push(event.map(field => field.trim()));
          }
          // Start Creation
          createAll(events, newInvalidEvents);
        }
      }
    })
  }

  let node = null;
  switch(status) {
    default:
    case ERROR:
      node = (
        <React.Fragment>
          <Header icon>
            <Icon name='warning sign' />
            Error!
          </Header>
          <p>{errMsg}</p>
        </React.Fragment>
      )
      break;
    case INIT:
    case PARSING:
      node = (
        <Dimmer active><Loader inverted active>Parsing File...</Loader></Dimmer>
      );
      break;
    case CREATING:
      node = (
        <Dimmer active><Loader active>Adding Authors...</Loader></Dimmer>
      )
      break;
    case DONE:
      node = (
        <React.Fragment>
          <Header icon>
            <Icon name="check" />
            Added {count} papers!
          </Header>
          {
            invalidEvents.length>0
            ?<p>Failed event(s): {`${invalidEvents.map(event => event[0]).join(", ")}`}</p>
            :null
          }
        </React.Fragment>
      )
  }

  return (
    <Segment placeholder>
      {node}
    </Segment>
  )
}

CreatePaperHandler.propTypes = {
  content: PropTypes.string.isRequired
}

export default CreatePaperHandler;