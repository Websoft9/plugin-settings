import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import 'bootstrap/dist/css/bootstrap.min.css';
import classNames from 'classnames';
import cockpit from 'cockpit';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Col, Modal, Row } from 'react-bootstrap';
import RbAlert from 'react-bootstrap/Alert';
import "./App.css";
import MarkdownCode from './components/MarkdownCode';
import Spinner from './components/Spinner';
import TagsInput from './components/TagsInput';
import { GetSettings, SetSettings } from './helpers';

const _ = cockpit.gettext;
const language = cockpit.language;

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const BootstrapTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} arrow classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.palette.common.black,
  },
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.common.black,
    maxWidth: 300,
    fontSize: 13,
  },
}));

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
              // setAlertMessage(_("Reset Api Key Failed"));

              const errorText = [error.problem, error.reason, error.message]
                .filter(item => typeof item === 'string')
                .join(' ');

              if (errorText.includes("permission denied")) {
                setAlertMessage("Your user does not have Docker permissions. Grant Docker permissions to this user by command: sudo usermod -aG docker <username>");
              }
              else {
                setAlertMessage(errorText || "Reset Api Key Failed");
              }
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
  const [showAlert, setShowAlert] = useState(false); //用于是否显示错误提示
  const [alertMessage, setAlertMessage] = useState("");//用于显示错误提示消息
  const [showMask, setShowMask] = useState(false); //用于设置遮罩层
  const [alertType, setAlertType] = useState("");  //用于确定弹窗的类型：error\success
  const [loading, setLoading] = useState(true);
  const [showProblem, setShowProblem] = useState(false);  //用于控制是否显示 cockpit的错误消息
  const [cockpitProblem, setCockpitProblem] = useState(null); //用于显示cockpit的错误消息
  const [apikey, setApikey] = useState(null);
  const [cockpitPort, setCockpitPort] = useState("");
  const [registry, setRegistry] = useState([]); //用于存储镜像仓库地址
  const [hasPendingInput, setHasPendingInput] = useState(false); //用于判断是否有镜像仓库地址未保存的输入
  const [wildcardDomain, setWildcardDomain] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPortEditing, setIsPortEditing] = useState(false);
  const [isRegistryEditing, setIsRegistryEditing] = useState(false);//用于判断是否正在编辑镜像仓库地址
  const tagsInputRef = useRef(null); //用于获取TagsInput组件的ref
  const [isWildcardDomainEditing, setIsWildcardDomainEditing] = useState(false);
  const [showConform, setShowConform] = useState(false); //用于显示确认重置Api Key弹窗
  const [originalCockpitPort, setOriginalCockpitPort] = useState(cockpitPort); //用于存储原始的cockpit端口
  const [originalDomain, setOriginalDomain] = useState(wildcardDomain); //用于存储原始的域名
  const [originalRegistry, setOriginalRegistry] = useState(registry); //用于存储原始的镜像仓库地址
  const daemonFilePath = "/etc/docker/daemon.json"; //docker配置文件路径

  const [currentVersion, setCurrentVersion] = useState("") //用于存储当前版本
  const [latestVersion, setLatestVersion] = useState("") //用于存储最新版本

  const updateCommand = 'wget -O install.sh https://websoft9.github.io/websoft9/install/install.sh && bash install.sh --execute_mode upgrade';
  const updateShell = `
\`\`\`bash
${updateCommand}
\`\`\`
`;


  const compareVersions = (v1, v2) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
  }


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
        exception = "Your user does not have Docker permissions. Grant Docker permissions to this user by command: sudo usermod -aG docker <username>";
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

  const handlerRegistrySave = async () => {
    try {
      if (hasPendingInput) {
        setShowAlert(true);
        setAlertType('error');
        setAlertMessage(_('Please press Enter to confirm the input before saving.'));
        return;
      }

      await cockpit.file(daemonFilePath).modify((old_content) => {
        let json;
        if (old_content === null) {
          json = {};
        } else {
          try {
            json = JSON.parse(old_content);
          } catch (error) {
            throw new Error(_("The Docker daemon configuration file is malformed."));
          }
        }

        json["registry-mirrors"] = registry;
        return JSON.stringify(json, null, 2);
      });

      setIsRegistryEditing(false);
      setShowAlert(true);
      setAlertType("success");
      setAlertMessage(_("Save Success"));

    } catch (error) {
      setShowAlert(true);
      setAlertType("error");
      setAlertMessage(error.message);
    }
  };


  const handleTagsChange = (newTags) => {
    setRegistry(newTags);
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

    //获取系统镜像加速地址
    cockpit.file(daemonFilePath).read().then(content => {
      if (content == null) return;
      const dockerConfig = JSON.parse(content);
      setRegistry(dockerConfig["registry-mirrors"] || []);
    }
    ).catch(error => {
      setShowAlert(true);
      setAlertType("error")
      setAlertMessage(error.message);
    });

    //获取当前版本
    cockpit.script(
      'grep -oP \'"version": "\\K[^"]+\' "$(docker compose ls | awk \'/websoft9/ {print $3}\' | sed \'s|/source/docker/docker-compose.yml||\')/source/version.json"',
      [],
      { err: "message" }
    ).then((stdout, stderr) => {
      const version = stdout.trim();
      setCurrentVersion(version);
    }).catch(error => {
      setShowAlert(true);
      setAlertType("error");
      setAlertMessage(error.message);
    });

    //获取最新版本：
    try {
      const response = await fetch('https://artifact.websoft9.com/release/websoft9/version.json');
      const data = await response.json();

      if (data?.version) {
        setLatestVersion(data.version);
      }
    } catch (error) {
      setShowAlert(true);
      setAlertType("error");
      setAlertMessage(error.message);
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
      <Row className="gx-0" style={{ padding: "30px" }}>
        <Col xs={12}>
          <Card>
            <Card.Header>
              <label className="me-2 fs-5 d-block">{_("System Settings")}</label>
            </Card.Header>
            <Card.Body>
              <Accordion expanded={true} className='mb-2'>
                <AccordionDetails>
                  <Typography>
                    <Row className="mb-4 d-flex align-items-center">
                      <Col style={{ textAlign: "right", flex: "0 0 10%" }}>
                        <span>{_("Port")}{" ："}</span>
                      </Col>
                      <Col>
                        <TextField
                          fullWidth
                          type="text"
                          size="small"
                          value={cockpitPort}
                          onChange={event => setCockpitPort(event.target.value)}
                          disabled={!isPortEditing}
                        />
                      </Col>
                      <Col style={{ flex: "0 0 10%" }}>
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
                      <Col style={{ flex: "0 0 30%" }}>
                        <span style={{ fontStyle: "italic", marginLeft: "10px", color: "green" }}>{_("If port not available, modifying it has no effect.")}</span>
                      </Col>
                    </Row>
                    <Row className="mb-4 d-flex align-items-center">
                      <Col style={{ textAlign: "right", flex: "0 0 10%" }}>
                        <span>{_("Global Domain")}{" ："}</span>
                      </Col>
                      <Col>
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
                      <Col style={{ flex: "0 0 10%" }}>
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
                      <Col style={{ flex: "0 0 30%" }}>
                        <span style={{ fontStyle: "italic", marginLeft: "10px", color: "green", marginRight: "2px" }}>{_("Enter the domain name after wildcard resolution.")}</span>
                        <a href={`https://support.websoft9.com/${language === "zh_CN" ? '' : 'en/'}docs/next/domain-prepare#wildcard`} target="_blank" className="text-muted">
                          <OpenInNewIcon color="primary" fontSize="small" />
                        </a>
                      </Col>
                    </Row>
                    <Row className="mb-4 d-flex align-items-center">
                      <Col style={{ textAlign: "right", flex: "0 0 10%" }}>
                        <span>{_("Registry URL")}{" ："}</span>
                      </Col>
                      <Col>
                        <TagsInput ref={tagsInputRef} initialTags={registry} isEditable={isRegistryEditing} onTagsChange={handleTagsChange} onPendingInputChange={setHasPendingInput} />
                      </Col>
                      <Col style={{ flex: "0 0 10%" }}>
                        {isRegistryEditing ? (
                          <>
                            <IconButton title='Save' onClick={handlerRegistrySave}>
                              <SaveIcon />
                            </IconButton>
                            <IconButton title='Cancel' onClick={() => {
                              setIsRegistryEditing(false);
                              setRegistry(originalRegistry);
                              if (tagsInputRef.current) {
                                tagsInputRef.current.clearInput();
                              }
                            }}>
                              <CancelIcon />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton title='Edit' onClick={() => {
                            setIsRegistryEditing(true);
                            setOriginalRegistry(registry);
                          }}>
                            <EditIcon />
                          </IconButton>
                        )}
                      </Col>
                      <Col style={{ flex: "0 0 30%" }}>
                        <span style={{ fontStyle: "italic", marginLeft: "10px", color: "green" }}>{_("After setting, you need to manually restart docker for it to take effect.")}</span>
                        <BootstrapTooltip title={_("Docker restart commands: sudo systemctl daemon-reload && sudo systemctl restart docker")} overlayStyle={{ fontSize: "20px" }} >
                          {' '}<HelpOutlineIcon fontSize="small" />
                        </BootstrapTooltip>
                      </Col>
                    </Row>
                    <Row className="mb-4 d-flex align-items-center">
                      <Col style={{ textAlign: "right", flex: "0 0 10%" }}>
                        <span>{_("Api Key")}{" ："}</span>
                      </Col>
                      <Col>
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
                      <Col style={{ flex: "0 0 40%" }}>
                        <IconButton title='reset' onClick={() => setShowConform(true)}>
                          <RefreshIcon />
                        </IconButton>
                      </Col>
                    </Row>
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion expanded={true} className='mb-2'>
                <AccordionDetails>
                  <Typography>
                    <label className="me-2 fs-5 d-block mb-2">
                      {_("System Updates")}
                      <span style={{ fontSize: "0.8em", marginLeft: "5px" }}>
                        {!latestVersion || compareVersions(latestVersion, currentVersion) <= 0 ? (
                          <span style={{ color: "#0b5ed7" }}>
                            ({_("Current version is up-to-date")})
                          </span>
                        ) : (
                          <span style={{ color: "#ff0000" }}>
                            ({_("Latest Version")}：{latestVersion})
                          </span>
                        )}
                      </span>
                    </label>
                  </Typography>
                  <Typography>
                    <div style={{ marginLeft: "10px", color: "#777676", marginBottom: '10px' }}>
                      {_("Please run the following command on the system terminal to implement the update:")}
                    </div>
                    <Row className="mb-2 d-flex align-items-center" >
                      <Col xs={8} md={8}>
                        <MarkdownCode markdown={updateShell} />
                      </Col>
                      <Col>
                        <IconButton title='Copy' onClick={() => copyToClipboard(updateCommand)}>
                          <FileCopyIcon />
                        </IconButton>
                      </Col>
                    </Row>
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Card.Body>
          </Card>
        </Col>
      </Row >
      <Row className="position-fixed bottom-0 start-0 end-0 bg-light p-3">
        <Col className="text-center">
          {_("Current Version")}{"："} <span style={{ color: "#0b5ed7" }}>{" "}{currentVersion}</span>
        </Col>
      </Row>

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
