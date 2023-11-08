import FileCopyIcon from '@mui/icons-material/FileCopy';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { IconButton } from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import MuiAlert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import 'bootstrap/dist/css/bootstrap.min.css';
import classNames from 'classnames';
import cockpit from 'cockpit';
import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Modal, Row } from 'react-bootstrap';
import RbAlert from 'react-bootstrap/Alert';
import FullModal from "react-modal";
import "./App.css";
import Spinner from './components/Spinner';

const _ = cockpit.gettext;

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// 获取Api Key
const getApiKey = async () => {
  try {
    var script = "docker exec -i websoft9-apphub apphub getconfig --section api_key --key key";
    const api_key = (await cockpit.spawn(["/bin/bash", "-c", script])).trim();
    if (!api_key) {
      return <p>Error: Api key is empty </p>;
    }
    return api_key
  }
  catch (error) {
    console.log(error);
  }
}

function App() {
  const [showUpdateLog, setShowUpdateLog] = useState(false); //用于更新弹窗
  const [updateContent, setUpdateContent] = useState({}); //用于存储更新内容
  const [showAlert, setShowAlert] = useState(false); //用于是否显示错误提示
  const [alertMessage, setAlertMessage] = useState("");//用于显示错误提示消息
  const [disable, setDisable] = useState(false);//用于更新按钮禁用
  const [showMask, setShowMask] = useState(false); //用于设置遮罩层
  const [alertType, setAlertType] = useState("");  //用于确定弹窗的类型：error\success
  const [showConfirm, setShowConfirm] = useState(false); //用于显示确认更新弹窗
  const [showComplete, setShowComplete] = useState(false); //用于显示更新完成提示弹窗
  const [loading, setLoading] = useState(false);
  const [showProblem, setshowProblem] = useState(false);  //用于控制是否显示 cockpit的错误消息
  const [cockpitProblem, setCockpitProblem] = useState(null); //用于显示cockpit的错误消息
  const [previewStatus, setPreviewStatus] = useState(null); //用于显示是否开启AppStore接收预览版
  const [apikey, setApikey] = useState(null);
  const [cockpitPort, setCockpitPort] = useState(null);
  const [wildcardDomain, setWildcardDomain] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const baseURL = `${window.location.protocol}//${window.location.hostname}`;

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  //ApiKey复制
  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setShowAlert(true);
        setAlertMessage(_("ApiKey copied successfully"));
        setAlertType("success");
      }).catch(err => {
        setShowAlert(true);
        setAlertMessage(_("ApiKey copied failed"));
        setAlertType("error");
      });
    }
    else {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        setShowAlert(true);
        setAlertMessage(_("ApiKey copied successfully"));
        setAlertType("success");
      }
      catch (err) {
        setShowAlert(true);
        setAlertMessage(_("ApiKey copied failed"));
        setAlertType("error");
      }
    }
  }

  const checkeUpdate = async (init) => {
    if (init) {
      setLoading(true);
    }
    try {
      let response = await cockpit.http({ "address": "websoft9-apphub", "port": 8080 }).get("/AppUpdateList");
      response = JSON.parse(response);
      if (response.Error) {
        setShowAlert(true);
        setAlertType("error")
        setAlertMessage(response.Error.Message);
      }
      else {
        setUpdateContent(response.ResponseData.Compare_content); //获取更新内容

        if (!init) { //如果不是第一次加载
          if (!response.ResponseData.Compare_content.update) { //如果没有更新
            setShowAlert(true);
            setAlertType("success")
            setAlertMessage(_("The system is already the latest version"));
          } else {
            setShowUpdateLog(true);
          }
        }
      }
      setLoading(false);
    }
    catch (error) {
      setshowProblem(true);
      if (error.problem) {
        setCockpitProblem(error.problem);
      }
      else {
        setShowAlert(true);
        setAlertType("error")
        setAlertMessage(error);
      }
    }
  };

  const systemUpdate = async () => {
    showConfirmClose();
    setShowMask(true);
    setShowUpdateLog(false);

    //调用更新脚本
    var script = "curl https://websoft9.github.io/websoft9/install/update.sh | bash";
    cockpit.spawn(["/bin/bash", "-c", script]).then(() => {
      setShowMask(false);
      closeFullModal();
      systemRestart();
    }).catch(exception => {
      setShowAlert(true);
      setAlertType("error")
      setAlertMessage(exception.toString());
      setShowMask(false);
    });
  }

  const systemRestart = () => {
    setShowComplete(false);
    cockpit.script("systemctl daemon-reload && systemctl restart cockpit.socket && systemctl restart cockpit.service").then(() => {
      console.log("system restart successful");
    }).catch(exception => {
      setShowAlert(true);
      setAlertType("error")
      setAlertMessage(exception.toString());
    });
  }

  const updateLogClose = () => {
    setShowUpdateLog(!showUpdateLog);
  };

  const showConfirmClose = () => {
    setShowConfirm(!showConfirm);
  };

  const showCompleteClose = () => {
    setShowComplete(!showComplete);
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowAlert(false);
    setAlertMessage("");
  };

  const closeFullModal = () => {
    setShowMask(false);
  };

  const getSettings = async () => {
    fetch(`${baseURL}/api/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-api-key': await getApiKey()
      }
    }).then(async response => {
      const settingsResponse = await response.json();
      if (response.status === 200) {
        setApikey(settingsResponse?.api_key?.key || "");
        setCockpitPort(settingsResponse?.cockpit?.port || "");
        setWildcardDomain(settingsResponse?.domain?.wildcard_domain || "");
      }
      else {
        throw new Error(settingsResponse.details);
      }
    }).catch((error) => {
      setShowAlert(true);
      setAlertType("error")
      setAlertMessage(error);
      // setAlertMessage(_("Get System Settings Failed"));
    });
  }


  useEffect(() => {
    async function init() {
      setLoading(true);
      await getSettings();
      setLoading(false);
    }
    init();
  }, []);

  if (loading) return (
    <div className="d-flex align-items-center justify-content-center m-5" style={{ flexDirection: "column" }}>
      <Spinner animation="border" variant="secondary" className='mb-5' />
      {showProblem && <RbAlert variant="danger" className="my-2">
        {cockpitProblem}
      </RbAlert>}
    </div>
  );

  return (
    <>
      <FullModal parentSelector={() => window.parent.document.body}
        isOpen={showMask}
        onRequestClose={closeFullModal}
        shouldCloseOnOverlayClick={false}
        contentLabel="Full Modal"
        style={{
          overlay: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(241, 243, 250, .8)",
            zIndex: 999
          },
          content: {
            position: "absolute",
            top: "40px",
            left: "40px",
            right: "40px",
            bottom: "40px",
          }
        }}
      >
        <img src="../settings/loading.gif" alt="loading" width="200px" style={{ display: "block", margin: "0 auto" }} />
        <h1 style={{ textAlign: "center", color: "#ffc31a" }}>
          <strong>
            {_("During the system update, it will take approximately 3-5 minutes. Please be patient and do not operate during the process to avoid unknown errors.")}
          </strong>
        </h1>
      </FullModal>

      <Row style={{ padding: "30px" }}>
        <Col xs={12}>
          <Card>
            <Card.Header>
              <label className="me-2 fs-5 d-block">{_("System Setting")}</label>
            </Card.Header>
            <Card.Body>
              <Accordion expanded={true} className='mb-2'>
                {/* <AccordionSummary
                  aria-controls="panel1a-content"
                  id="panel1a-header"
                >
                  <Typography>
                    <label className="me-2 fs-5 d-block">{_("Api Key")}</label>
                  </Typography>
                </AccordionSummary> */}
                <AccordionDetails>
                  <Typography>
                    <Row className="mb-2 d-flex align-items-center">
                      <Col xs={1} md={1} style={{ textAlign: "right" }}>
                        <span>{_("System Port")}{" ："}</span>
                      </Col>
                      <Col>
                        <TextField
                          style={{ width: '800px' }}
                          type="text"
                          size="small"
                          value={cockpitPort}
                        />
                      </Col>
                    </Row>
                    <Row className="mb-2 d-flex align-items-center">
                      <Col xs={1} md={1} style={{ textAlign: "right" }}>
                        <span>{_("Domain")}{" ："}</span>
                      </Col>
                      <Col>
                        <TextField
                          style={{ width: '800px' }}
                          type="text"
                          size="small"
                          value={wildcardDomain}
                        />
                      </Col>
                    </Row>
                    <Row className="mb-2 d-flex align-items-center">
                      <Col xs={1} md={1} style={{ textAlign: "right" }}>
                        <span>{_("Api Key")}{" ："}</span>
                      </Col>
                      <Col>
                        <TextField
                          style={{ width: '800px' }}
                          type={showPassword ? 'text' : 'password'}
                          size="small"
                          value={apikey}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={handleTogglePasswordVisibility}
                                >
                                  {showPassword ? <Visibility /> : <VisibilityOff />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                        <IconButton title='Copy' onClick={() => copyToClipboard(apikey)}>
                          <FileCopyIcon />
                        </IconButton>
                      </Col>
                    </Row>

                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* <Accordion expanded={true} className='mb-2'>
                <AccordionSummary
                  aria-controls="panel1a-content"
                  id="panel1a-header"
                >
                  <Typography>
                    <label className="me-2 fs-5 d-block">{_("System Updates")}</label>
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    <Row className="mb-2 align-items-center">
                      <Col xs={6} md={6} className="d-flex">
                        {_("Current Version")}{" ："}<span style={{ color: "#0b5ed7" }}>{" "}{updateContent?.local_version}</span>
                      </Col>
                      <Col xs={6} md={6} className="d-flex">
                        {
                          updateContent.update ? <Button variant="primary" size="sm" className="position-relative me-2"
                            onClick={() => setShowUpdateLog(true)}>
                            {_("Update Available")}
                            <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                              <span className="visually-hidden">New alerts</span>
                            </span>
                          </Button> : <Button variant="primary" size="sm" className="me-2" disabled={disable}
                            onClick={async () => {
                              setDisable(true);
                              await checkeUpdate(false);
                              setDisable(false);
                            }} >
                            {disable && <Spinner className="spinner-border-sm me-1" tag="span" color="white" />}
                            {_("Check for updates")}
                          </Button>
                        }
                      </Col>
                    </Row>
                  </Typography>
                </AccordionDetails>
              </Accordion> */}
            </Card.Body>
          </Card>
        </Col>
      </Row >
      <Modal show={showConfirm} onHide={showConfirmClose} size="lg"
        scrollable="true" backdrop="static" >
        <Modal.Header onHide={showConfirmClose} closeButton className={classNames('modal-colored-header', 'bg-warning')} style={{ color: "#fff" }}>
          {_("System Updates")}
        </Modal.Header>
        <Modal.Body className="row" >
          {_("The update operation requires restarting the service. Do you want to continue?")}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={showConfirmClose}>
            {_("Ignore")}
          </Button>
          <Button variant='warning' className='bg-warning' onClick={systemUpdate}>
            {_("Update")}
          </Button>
        </Modal.Footer>
      </Modal >

      <Modal show={showUpdateLog} onHide={updateLogClose} size="lg"
        scrollable="true" backdrop="static" >
        <Modal.Header onHide={updateLogClose} closeButton className={classNames('modal-colored-header', 'bg-primary')} style={{ color: "#fff" }}>
          {_("Update Log")}
        </Modal.Header>
        <Modal.Body className="row" >
          <p><strong>{_("Latest Version")}</strong>{" : "}<span style={{ color: "#0b5ed7" }}>{updateContent?.target_version}</span></p>
          <p><strong>{_("Update Time")}</strong>{" : "}{updateContent?.date}</p>
          <p><strong>{_("Update Content")}</strong>{" : "}</p>
          {updateContent?.content?.map((item, index) => (
            <p key={index}>{item}</p>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={updateLogClose}>
            {_("Ignore")}
          </Button>
          <Button variant='primary' className='bg-primary' onClick={() => { setShowConfirm(true); setShowUpdateLog(false); }}>
            {_("Update")}
          </Button>
        </Modal.Footer>
      </Modal >

      <Snackbar open={showAlert} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={handleClose} severity={alertType} sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

export default App;