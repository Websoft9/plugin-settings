import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
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
import MarkdownCode from './components/MarkdownCode';
import Spinner from './components/Spinner';
import { GetSettings, SetSettings } from './helpers';

const _ = cockpit.gettext;
const language = cockpit.language;

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const ResetApiKeyConform = (props) => {
  const [disable, setDisable] = useState(false);//用于按钮禁用
  const [showAlert, setShowAlert] = useState(false); //用于是否显示错误提示
  const [alertType, setAlertType] = useState("");  //用于确定弹窗的类型：error\success
  const [alertMessage, setAlertMessage] = useState("");//用于显示错误提示消息
  const [showCloseButton, setShowCloseButton] = useState(true);//用于是否显示关闭按钮

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowAlert(false);
    setAlertMessage("");
  };

  return (
    <>
      <Modal show={props.showConform} onHide={props.onClose} size="lg"
        scrollable="true" backdrop="static" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <Modal.Header onHide={props.onClose} className={classNames('modal-colored-header', 'bg-warning')}>
          <h4>{_("Reset Api Key")}</h4>
        </Modal.Header>
        <Modal.Body className="row" >
          <span style={{ margin: "10px 0px" }}>{_("Resetting the Api Key may cause API calls to become invalid. Are you sure you want to reset?")}</span>
        </Modal.Body>
        <Modal.Footer>
          {
            showCloseButton && (
              <Button variant="light" onClick={props.onClose}>
                {_("Close")}
              </Button>
            )}
          {" "}
          <Button disabled={disable} variant="warning" onClick={async () => {
            try {
              setDisable(true);
              setShowCloseButton(false);
              var script = "docker exec -i websoft9-apphub apphub genkey";
              const api_key = (await cockpit.spawn(["/bin/bash", "-c", script], { superuser: "try" })).trim();
              if (!api_key) {
                setShowAlert(true);
                setAlertType("error")
                setAlertMessage(_("Reset Api Key Failed"));
              }
              else {
                props.onClose();
                props.refreshData();

                props.showFatherAlert("success", _("Reset Api Key Success"));
              }
            }
            catch (error) {
              setShowAlert(true);
              setAlertType("error")
              setAlertMessage(_("Reset Api Key Failed"));
            }
            finally {
              setDisable(false);
              setShowCloseButton(true);
            }
          }
          }>
            {disable && <Spinner className="spinner-border-sm me-1" tag="span" color="white" />} {_("Reset")}
          </Button>
        </Modal.Footer>
      </Modal >
      {
        showAlert &&
        <Snackbar open={showAlert} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <MuiAlert onClose={handleClose} severity={alertType} sx={{ width: '100%' }}>
            {alertMessage}
          </MuiAlert>
        </Snackbar>
      }
    </>

  );
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
  const [showProblem, setShowProblem] = useState(false);  //用于控制是否显示 cockpit的错误消息
  const [cockpitProblem, setCockpitProblem] = useState(null); //用于显示cockpit的错误消息
  const [previewStatus, setPreviewStatus] = useState(null); //用于显示是否开启AppStore接收预览版
  const [apikey, setApikey] = useState(null);
  const [cockpitPort, setCockpitPort] = useState("");
  const [wildcardDomain, setWildcardDomain] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPortEditing, setIsPortEditing] = useState(false);
  const [isWildcardDomainEditing, setIsWildcardDomainEditing] = useState(false);
  const [showConform, setShowConform] = useState(false); //用于显示确认重置Api Key弹窗
  const [originalCockpitPort, setOriginalCockpitPort] = useState(cockpitPort); //用于存储原始的cockpit端口
  const [originalDomain, setOriginalDomain] = useState(wildcardDomain); //用于存储原始的域名
  const baseURL = `${window.location.protocol}//${window.location.hostname}`;

  const updateCommand = 'wget -O install.sh https://websoft9.github.io/websoft9/install/install.sh && bash install.sh';
  const updateShell = `
\`\`\`bash
${updateCommand}
\`\`\`
`;

  const showFatherAlert = (type, message) => {
    setShowAlert(true);
    setAlertType(type);
    setAlertMessage(message);
  }

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  //ApiKey复制
  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setShowAlert(true);
        setAlertMessage(_("Copied successfully"));
        setAlertType("success");
      }).catch(err => {
        setShowAlert(true);
        setAlertMessage(_("Copied failed"));
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
        setAlertMessage(_("Copied successfully"));
        setAlertType("success");
      }
      catch (err) {
        setShowAlert(true);
        setAlertMessage(_("Copied failed"));
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
      setShowProblem(true);
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
    //setShowUpdateLog(false);

    //调用更新脚本
    var script = "wget -O install.sh https://websoft9.github.io/websoft9/install/install.sh && bash install.sh";
    try {
      await cockpit.spawn(["/bin/bash", "-c", script], { superuser: "try" });
      setShowMask(false);
      closeFullModal();
      systemRestart();
    }
    catch (error) {
      setShowAlert(true);
      setAlertType("error")
      setAlertMessage(error.toString());
      setShowMask(false);
    }


    // cockpit.spawn(["/bin/bash", "-c", script], { superuser: "try" }).then(() => {
    //   setShowMask(false);
    //   closeFullModal();
    //   systemRestart();
    // }).catch(exception => {
    //   setShowAlert(true);
    //   setAlertType("error")
    //   setAlertMessage(exception.toString());
    //   setShowMask(false);
    // });
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

  const handlerPortSave = async () => {
    if (cockpitPort.trim() === "") {
      setShowAlert(true);
      setAlertType("error")
      setAlertMessage(_("Port can not be empty"));
      return;
    }
    if (isNaN(cockpitPort)) {
      setShowAlert(true);
      setAlertType("error")
      setAlertMessage(_("Port must be a number"));
      return;
    }
    if (cockpitPort < 1 || cockpitPort > 65535) {
      setShowAlert(true);
      setAlertType("error")
      setAlertMessage(_("Port must be a number between 1 and 65535"));
      return;
    }

    if (cockpitPort === originalCockpitPort) {
      setIsPortEditing(false);
      return;
    }

    try {
      var script = "bash /usr/share/cockpit/appstore/validate_ports.sh " + cockpitPort;
      const no_validate_ports = await cockpit.spawn(["/bin/bash", "-c", script], { superuser: "try" });
      if (no_validate_ports.toString().trim() != "ok") {
        setShowAlert(true);
        setAlertType("error")
        setAlertMessage(cockpit.format(_("Port: $0 is already in use."), no_validate_ports));
        return;
      }
    }
    catch (error) {
      const errorText = [error.problem, error.reason, error.message]
        .filter(item => typeof item === 'string')
        .join(' ');
      let exception = errorText || "Validation Port Error";
      if (errorText.includes("permission denied")) {
        exception = "Permission denied";
      }
      setShowAlert(true);
      setAlertType("error")
      setAlertMessage(exception);
      return;
    }

    try {
      const settingsResponse = await SetSettings("cockpit", { key: "port", value: cockpitPort });
      setIsPortEditing(false);
      setShowAlert(true);
      setAlertType("success")
      setAlertMessage(_("Save Success"));

      init();
    }
    catch (error) {
      setShowAlert(true);
      setAlertType("error")
      setAlertMessage(error.message);
    }
  };

  const handlerDomainSave = async () => {
    if (wildcardDomain.startsWith('http://') || wildcardDomain.startsWith('https://')) {
      setShowAlert(true);
      setAlertType("error")
      setAlertMessage(_("Domain can not start with http:// or https://"));
      return;
    }

    if (wildcardDomain === originalDomain) {
      setIsWildcardDomainEditing(false);
      return;
    }

    try {
      const settingsResponse = await SetSettings("domain", { key: "wildcard_domain", value: wildcardDomain });
      setIsWildcardDomainEditing(false);
      setShowAlert(true);
      setAlertType("success")
      setAlertMessage(_("Save Success"));

      init();
    }
    catch (error) {
      setShowAlert(true);
      setAlertType("error")
      setAlertMessage(error.message);
    }
  }

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
    setLoading(true);

    try {
      const settingsResponse = await GetSettings();
      setApikey(settingsResponse?.api_key?.key || "");
      setCockpitPort(settingsResponse?.cockpit?.port.toString() || "");
      setWildcardDomain(settingsResponse?.domain?.wildcard_domain || "");
      setLoading(false);
    }
    catch (error) {
      setShowProblem(true);
      setCockpitProblem(error.message || _("Get System Settings Failed"));
    }
  }

  async function init() {
    await getSettings();
  }

  useEffect(() => {
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
                    <Row className="mb-4 d-flex align-items-center">
                      <Col xs={1} md={1} style={{ textAlign: "right" }}>
                        <span>{_("Port")}{" ："}</span>
                      </Col>
                      <Col xs={6} md={6}>
                        <TextField
                          fullWidth
                          type="text"
                          size="small"
                          value={cockpitPort}
                          onChange={event => setCockpitPort(event.target.value)}
                          disabled={!isPortEditing}
                        />
                      </Col>
                      <Col xs={1} md={1}>
                        {isPortEditing ? (
                          <>
                            <IconButton title='Save' onClick={handlerPortSave}>
                              <SaveIcon />
                            </IconButton>
                            <IconButton title='Cancel' onClick={() => { setIsPortEditing(false); setCockpitPort(originalCockpitPort); }}>
                              <CancelIcon />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton title='Edit' onClick={() => { setIsPortEditing(true); setOriginalCockpitPort(cockpitPort); }}>
                            <EditIcon />
                          </IconButton>
                        )}

                      </Col>
                      <Col>
                        <span style={{ fontStyle: "italic", marginLeft: "10px", color: "green" }}>{_("If port not available, modifying it has no effect.")}</span>
                      </Col>
                    </Row>
                    <Row className="mb-4 d-flex align-items-center">
                      <Col xs={1} md={1} style={{ textAlign: "right" }}>
                        <span>{_("Global Domain")}{" ："}</span>
                      </Col>
                      <Col xs={6} md={6}>
                        <div>
                          <TextField
                            fullWidth
                            type="text"
                            size="small"
                            value={wildcardDomain}
                            onChange={event => setWildcardDomain(event.target.value)}
                            disabled={!isWildcardDomainEditing}
                          />
                        </div>
                      </Col>
                      <Col xs={1} md={1}>
                        {isWildcardDomainEditing ? (
                          <>
                            <IconButton title='Save' onClick={handlerDomainSave}>
                              <SaveIcon />
                            </IconButton>
                            <IconButton title='Cancel' onClick={() => { setIsWildcardDomainEditing(false); setWildcardDomain(originalDomain); }}>
                              <CancelIcon />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton title='Edit' onClick={() => { setIsWildcardDomainEditing(true); setOriginalDomain(wildcardDomain); }}>
                            <EditIcon />
                          </IconButton>
                        )}
                      </Col>
                      <Col>
                        <span style={{ fontStyle: "italic", marginLeft: "10px", color: "green", marginRight: "2px" }}>{_("Enter the domain name after wildcard resolution.")}</span>
                        <a href="https://support.websoft9.com/docs/install/requirements#domain" target="_blank" className="text-muted">
                          <HelpOutlineIcon />
                        </a>
                      </Col>
                    </Row>
                    <Row className="mb-4 d-flex align-items-center">
                      <Col xs={1} md={1} style={{ textAlign: "right" }}>
                        <span>{_("Api Key")}{" ："}</span>
                      </Col>
                      <Col xs={6} md={6}>
                        <TextField
                          fullWidth
                          type={showPassword ? 'text' : 'password'}
                          size="small"
                          value={apikey}
                          onChange={event => setApikey(event.target.value)}
                          disabled
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton onClick={handleTogglePasswordVisibility}>
                                  {showPassword ? <Visibility /> : <VisibilityOff />}
                                </IconButton>
                                <IconButton title='Copy' onClick={() => copyToClipboard(apikey)}>
                                  <FileCopyIcon />
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Col>
                      <Col>
                        <IconButton title='reset' onClick={() => setShowConform(true)}>
                          <RefreshIcon />
                        </IconButton>
                      </Col>
                    </Row>
                  </Typography>
                </AccordionDetails>
              </Accordion>



              <Accordion expanded={true} className='mb-2'>
                {/* <AccordionSummary
                  aria-controls="panel1a-content"
                  id="panel1a-header"
                >
                  <Typography>
                    <label className="me-2 fs-5 d-block">{_("System Updates")}</label>
                  </Typography>
                </AccordionSummary> */}
                <AccordionDetails>
                  <Typography>
                    <label className="me-2 fs-5 d-block mb-2">{_("System Updates")}</label>
                  </Typography>
                  <Typography>
                    <div style={{ fontStyle: "italic", marginLeft: "10px", color: "green", marginBottom: '10px' }}>
                      {_("Please run the following command on the system terminal to implement the update:")}
                    </div>
                    <Row className="mb-2 d-flex align-items-center" >
                      <Col xs={7} md={7}>
                        <MarkdownCode markdown={updateShell} />
                      </Col>
                      <Col>
                        <IconButton title='Copy' onClick={() => copyToClipboard(updateCommand)}>
                          <FileCopyIcon />
                        </IconButton>
                      </Col>


                      {/* <Col xs={4} md={4} className="d-flex"> */}
                      {/* <Button variant='primary' className='bg-primary' onClick={() => { setShowConfirm(true); setShowUpdateLog(false); }}>
                        {_("Update")}
                      </Button> */}
                      {/* </Col> */}
                      {/* <Col xs={6} md={6} className="d-flex">
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
                      </Col> */}
                    </Row>
                  </Typography>
                </AccordionDetails>
              </Accordion>
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

      <ResetApiKeyConform showConform={showConform} onClose={() => setShowConform(false)} refreshData={() => init()} showFatherAlert={showFatherAlert} />

      <Snackbar open={showAlert} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={handleClose} severity={alertType} sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

export default App;