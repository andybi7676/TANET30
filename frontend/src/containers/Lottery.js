import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Loader, Grid, Form, Button, Message } from 'semantic-ui-react';
import { ErrMsg } from '../components';
import { BACKEND } from '../config';
import { useAPI } from '../hooks';


export default () => {
  const { token } = useSelector(state => state.user);
  const [connection, connect] = useAPI("json");
  const [courseThreshold, setCourseThreshold] = useState(-1);
  const [companyThreshold, setCompanyThreshold] = useState(-1);
  const [list, setList] = useState(null);
  const [editState, edit] = useAPI("text");
  const [error, setError] = useState(null);
  const [_, resetList] = useAPI("text");

  let display = null;

  //把名字第二個字變Ｏ
  const replace = (word, idx, char) => {
    return word.substring(0,idx) + char + word.substring(idx+1);
  }

  const updateThresholds = (courseBar, companyBar) => {
    if(courseBar < 0 || companyBar < 0){
      setError("Invalid Threshold!");
      return;
    }
    setError(null);
    const body = { course: courseBar, company: companyBar };
    edit(
      BACKEND + "/event/lottery",
      "POST",
      JSON.stringify(body),
      {'authorization': token, 'content-type': "application/json"}
    )
  }

  const onFilter = () => {
    updateThresholds(courseThreshold, companyThreshold);
    resetList(
      BACKEND + "/event/clearList",
      "POST",
      null,
      { 'authorization': token, 'content-type': "application/json" }
    )
    let id_to_user = {};
    let id_to_count = {}; // id -> [courseCount, companyCount]
    for(let event of connection.response) {
      const isCourse = event.admin.group === "seminarStaff";
      for(let participant of event.participant) {
        if(id_to_user[participant.user._id] === undefined) {
          id_to_user[participant.user._id] = participant.user;
          id_to_count[participant.user._id] = [0,0];
        }
        let count = id_to_count[participant.user._id];
        if(isCourse) count[0] = count[0] += 1;
        else count[1] = count[1] += 1;
        id_to_count[participant.user._id] = count;
      }
    }
    let userList = [];
    for(const [id, count] of Object.entries(id_to_count)) {
      if(count[0] >= courseThreshold && count[1] >= companyThreshold) {
        userList.push(id_to_user[id]);
      }
    }
    setList(userList);
    UpdateList(userList);
  }

  const addToList = async (_name, _sector, _index) => {
      const body = {name: _name, sector: _sector ? _sector : "unavailable", index: _index};
      return await fetch(
        BACKEND + "/event/lotteryList", 
        {
          method: "POST",
          body: JSON.stringify(body),
          headers: {'authorization': token, 'content-type': "application/json"}
        }
      )
      .then(res => {
        if(res.status !== 200) {
          console.error(`Got ${res.status} for user:`, _name);
          return false;
        }
        else {
          return true;
        }
      })
      .catch(err => {
        console.error(err);
        return false;
      })
  }

  async function UpdateList (list) {
    for(let i = 0; i < list.length; ++i){
      await addToList(list[i].name, list[i].sector, i);
    }
  }

  if (connection.isInit()) {
    connect(
      BACKEND + `/event?populate=1`,
      "GET",
      null,
      { 'authorization': token, 'content-type': "application/json" }
    );
  }

  if (connection.error) {
    display = <ErrMsg />;
  }
  else if (connection.success) {
    display = <div>Set filter first.</div>;
    if(list !== null) {
      // UpdateList();
      const text = "流水號,姓名,服務單位\n" + list.map((user, index) => `${index+1},${replace(user.name, 1, "Ｏ")},${user.sector}`).join("\n");
      const data = new Blob([text], {type: 'text/plain'});
      const url = window.URL.createObjectURL(data);
      display = (
        <div>
          <span>There are {list.length} users qualified.</span><br />
          <Button color="blue" as="a" href={url} download="list.csv" style={{marginTop: "2vh"}}>Download List</Button>
        </div>
      )
    }
  }
  else {
    display = <Loader active={true} />;
  }
  return (
    <Grid textAlign="center" verticalAlign='middle' style={{ width: "100%", marginTop: "2vh" }}>
      <Grid.Row columns={2}>
        <Grid.Column style={{ width: "80%", maxWidth: "30em" }}>
          <Form>
            <Form.Field>
              <label>Course Threshold</label>
              <input 
                type='number' 
                placeholder='Some Number...' 
                onInput={e => setCourseThreshold(parseInt(e.target.value))} 
              />
            </Form.Field>
            <Form.Field>
              <label>Company Threshold</label>
              <input
                type='number'
                placeholder='Some Number...'
                onInput={e => setCompanyThreshold(parseInt(e.target.value))}
              />
            </Form.Field>
            <Button onClick={_ => onFilter()}>Filter</Button>
          </Form>
          {
            editState.error || error
            ?
            <Message negative>{error ? error : editState.errMsg}</Message>
            :
            null
          }
          {
            editState.success
            ?
            <Message positive>Update Thresholds Success!</Message>
            :
            null
          }
        </Grid.Column>
        <Grid.Column>
          {display}
        </Grid.Column>
      </Grid.Row>
    </Grid>
  )
}

