import React, { useState } from 'react';
import { Header, Icon, Divider, Dropdown, Menu, Message, CardGroup, Card } from 'semantic-ui-react';
import QrReader from 'react-qr-reader';
import { useSelector } from 'react-redux';
import { ticketTypeEnum, BACKEND } from '../config';
import ok from './Event/ok.mp3';
import { useAPI, useAudio } from '../hooks';
import { today } from '../util';

const foodTypes = ticketTypeEnum.map(type => ({ key: type, value: type, text: type }));
const functions = ["Scan QR-Code", "Available Tickets", "Used Tickets"];

export default () => {
  console.log("[*] Viewing Food Staff Page");
  const [type, setType] = useState(null);
  const [activeItem, setActiveItem] = useState(functions[0]);
  const [getTicketState, getTicket] = useAPI("json");
  const [audioTag, play] = useAudio(ok);
  const onSuccess = () => {play();alert("Success!");}
  const [spendTicketState, spendTicket, initSpendTicket] = useAPI("json", onSuccess);
  const [error, setError] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [scanned, setScanned] = useState([]);
  const { token } = useSelector(state => state.user)

  const tickets = getTicketState.response || [];
  console.log(tickets);
  const availTickets = tickets.filter(ticket => ticket.usedTime === 0);
  const usedTickets = tickets.filter(ticket => ticket.usedTime !== 0);

  const init = () => {
    setScanned([]);
    setError(false);
    setErrMsg("");
    initSpendTicket();
  }

  const onSelect = (_, { value: type }) => {
    setType(type);
    init();
    getTicket(
      BACKEND + `/ticket?date=${today()}&type=${type}&populate=true`,
      "GET",
      null,
      { 'authorization': token }
    );
  }

  const onScan = (data) => {
    if (data === null) return;
    if (error === true) {
      setError(false);
      setErrMsg("");
    }
    if(scanned.includes(data)) {
      console.log(data, "scanned");
      return;
    }
    spendTicket(
      BACKEND + "/ticket/use",
      "POST",
      JSON.stringify({ owner: data, type }),
      { 'authorization': token, 'content-type': "application/json" }
    )
    setScanned([...scanned, data]);
  }

  const onError = () => {
    setError(true);
    setErrMsg("Scan QR-Code Error!");
  }

  let display = null;
  switch (activeItem) {
    default:
    case functions[0]: // Scan QR-Code
      display = (
        <React.Fragment>
          <Dropdown
            placeholder='Select Type'
            fluid
            selection
            onChange={onSelect}
            options={foodTypes}
            value={type}
            style={{ margin: "1em 0" }}
          />
          {type === null ? null :
            <QrReader
              delay={300}
              onError={onError}
              onScan={onScan}
              style={{ maxWidth: "500px", width: "100%", margin: "auto" }}
            />
          }
          {spendTicketState.error || error
            ?
            <Message negative>{error ? errMsg : spendTicketState.errMsg}</Message>
            :
            null
          }
          {spendTicketState.success
            ?
            <Message positive>
              <Message.Header>
                {spendTicketState.response.name}
              </Message.Header>
              <Message.Content>
                checkin success!
              </Message.Content>
            </Message>
            :
            null
          }
        </React.Fragment>
      )
      break;
    case functions[1]: // Available Tickets
      display = (
        <CardGroup stackable>
          {availTickets.map(({owner}) => (
            <Card key={owner._id} link>
              <Card.Header as='h3'>{owner.name}</Card.Header>
              <Card.Meta>{owner.email}</Card.Meta>
            </Card>
          ))}
        </CardGroup>
      )
      break;
    case functions[2]: // Used Tickets
      display = (
        <CardGroup stackable>
          {usedTickets.map(({owner}) => (
            <Card key={owner._id} link>
              <Card.Header as='h3'>{owner.name}</Card.Header>
              <Card.Meta>{owner.email}</Card.Meta>
            </Card>
          ))}
        </CardGroup>
      )
      break;
  }

  return (
    <div style={{ marginTop: "2em", width: "80%" }}>
      <Header as='h2' icon textAlign='center'>
        <Icon name='food' circular />
        <Header.Content>Send Food</Header.Content>
      </Header>
      <Divider />
      <Menu stackable widths={3}>
        {functions.map(_func => (
          <Menu.Item
            name={_func}
            active={activeItem === _func}
            onClick={(_, { name }) => {setActiveItem(name); init();}}
            key={_func}
          />
        ))}
      </Menu>
      {display}
      {audioTag}
    </div>
  )
}