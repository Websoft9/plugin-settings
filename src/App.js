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
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
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
import { GetSettings, SetSettings, GetSslCertificates } from './helpers';

const _ = cockpit.gettext;
const language = cockpit.language;

const MyMuiAlert = React.forwardRef(function Alert(props, ref) {
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
  const [showCloseButton, setShowCloseButton] = useState(true);//用于是否显示关闭按钮

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
                props.showFatherAlert("error", _("Reset Api Key Failed"));
              }
              else {
                props.onClose();
                props.refreshData();

                props.showFatherAlert("success", _("Reset Api Key Success"));
              }
            }
            catch (error) {
              const errorText = [error.problem, error.reason, error.message]
                .filter(item => typeof item === 'string')
                .join(' ');

              if (errorText.includes("permission denied")) {
                props.showFatherAlert("error", "Your user does not have Docker permissions. Grant Docker permissions to this user by command: sudo usermod -aG docker <username>");
              }
              else {
                props.showFatherAlert("error", errorText || "Reset Api Key Failed");
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
  const [sslCertificates, setSslCertificates] = useState([]); //用于存储SSL证书列表
  const [selectedCertificate, setSelectedCertificate] = useState(JSON.stringify({ id: -1, provider: "system-default" })); //用于存储选中的SSL证书
  const [cockpitPort, setCockpitPort] = useState("");
  const [registry, setRegistry] = useState([]); //用于存储镜像仓库地址
  const [hasPendingInput, setHasPendingInput] = useState(false); //用于判断是否有镜像仓库地址未保存的输入
  const [wildcardDomain, setWildcardDomain] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPortEditing, setIsPortEditing] = useState(false);
  const [isRegistryEditing, setIsRegistryEditing] = useState(false);//用于判断是否正在编辑镜像仓库地址
  const tagsInputRef = useRef(null); //用于获取TagsInput组件的ref
  const [isWildcardDomainEditing, setIsWildcardDomainEditing] = useState(false);
  const [isSslCertificateEditing, setIsSslCertificateEditing] = useState(false);//用于判断是否正在编辑SSL证书
  const [showConform, setShowConform] = useState(false); //用于显示确认重置Api Key弹窗
  const [originalCockpitPort, setOriginalCockpitPort] = useState(cockpitPort); //用于存储原始的cockpit端口
  const [originalDomain, setOriginalDomain] = useState(wildcardDomain); //用于存储原始的域名
  const [originalRegistry, setOriginalRegistry] = useState(registry); //用于存储原始的镜像仓库地址
  const [originalSelectedCertificate, setOriginalSelectedCertificate] = useState(selectedCertificate); //用于存储原始的SSL证书选择
  const daemonFilePath = "/etc/docker/daemon.json"; //docker配置文件路径

  const [currentVersion, setCurrentVersion] = useState("") //用于存储当前版本
  const [latestVersion, setLatestVersion] = useState("") //用于存储最新版本

  const updateCommand = 'wget -O install.sh https://artifact.websoft9.com/release/websoft9/install.sh && bash install.sh --execute_mode upgrade';
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

  // 解析SSL证书路径，提取证书ID
  const parseSslCertPath = (sslCertPath) => {
    if (!sslCertPath) return null;

    // 如果是系统默认证书路径
    if (sslCertPath === "/data/custom_ssl/websoft9-self-signed.cert") {
      return "-1";
    }

    // 解析路径中的证书ID：npm-6 或 npm-14
    const match = sslCertPath.match(/npm-(\d+)/);
    if (match && match[1]) {
      return match[1]; // 返回提取的数字ID
    }

    return null;
  };

  // 获取SSL证书列表
  const getSslCertificates = async (sslCertPath = null) => {
    try {
      const certificates = await GetSslCertificates();
      setSslCertificates(certificates);

      // 根据ssl_cert路径设置默认选择
      if (sslCertPath) {
        const certId = parseSslCertPath(sslCertPath);
        if (certId === "-1") {
          setSelectedCertificate(JSON.stringify({ id: -1, provider: "system-default" }));
        } else if (certId) {
          // 在证书列表中查找匹配的证书
          const matchedCert = certificates.find(cert => cert.id.toString() === certId);
          if (matchedCert) {
            setSelectedCertificate(JSON.stringify({ id: matchedCert.id, provider: matchedCert.provider }));
          } else {
            setSelectedCertificate(JSON.stringify({ id: -1, provider: "system-default" })); // 如果没找到匹配的证书，默认选择系统默认
          }
        } else {
          setSelectedCertificate(JSON.stringify({ id: -1, provider: "system-default" })); // 默认选择系统默认
        }
      } else {
        setSelectedCertificate(JSON.stringify({ id: -1, provider: "system-default" })); // 默认选择系统默认
      }
    } catch (error) {
      console.error('Error fetching SSL certificates:', error);
      setShowAlert(true);
      setAlertType("error");
      setAlertMessage(_("Failed to load SSL certificates"));
    }
  }; const handlerPortSave = async () => {
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
      const settingsResponse = await SetSettings("nginx_proxy_manager", { key: "listen_port", value: cockpitPort });
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

  const handlerSslCertificateSave = async () => {
    if (selectedCertificate === originalSelectedCertificate) {
      setIsSslCertificateEditing(false);
      return;
    }

    try {
      // 解析选中的证书信息
      let certInfo = null;
      try {
        certInfo = JSON.parse(selectedCertificate);
      } catch (e) {
        console.error("Error parsing certificate info:", e);
        // 如果解析失败，默认设置为系统默认
        certInfo = { id: -1, provider: "system-default" };
      }

      let sslCertPath, sslKeyPath;

      // 根据证书类型和ID生成路径
      if (certInfo.id === -1) {
        // 系统默认证书
        sslCertPath = "/data/custom_ssl/websoft9-self-signed.cert";
        sslKeyPath = "/data/custom_ssl/websoft9-self-signed.key";
      } else {
        // 根据provider类型生成路径
        if (certInfo.provider === "other") {
          sslCertPath = `/data/custom_ssl/npm-${certInfo.id}/fullchain.pem`;
          sslKeyPath = `/data/custom_ssl/npm-${certInfo.id}/privkey.pem`;
        } else if (certInfo.provider === "letsencrypt") {
          sslCertPath = `/etc/letsencrypt/live/npm-${certInfo.id}/fullchain.pem`;
          sslKeyPath = `/etc/letsencrypt/live/npm-${certInfo.id}/privkey.pem`;
        } else {
          throw new Error(_("Unsupported certificate provider"));
        }
      }

      // 原子操作：保存SSL证书配置，要么都成功要么都失败
      let sslCertSuccess = false;
      let originalSslCertPath = null;
      let originalSslKeyPath = null;

      try {
        // 先获取当前的SSL配置作为回滚备份
        const currentSettings = await GetSettings();
        originalSslCertPath = currentSettings?.nginx_proxy_manager?.ssl_cert;
        originalSslKeyPath = currentSettings?.nginx_proxy_manager?.ssl_key;

        // 第一步：保存ssl_cert配置
        await SetSettings("nginx_proxy_manager", { key: "ssl_cert", value: sslCertPath });
        sslCertSuccess = true;

        // 第二步：保存ssl_key配置
        await SetSettings("nginx_proxy_manager", { key: "ssl_key", value: sslKeyPath });

        // 两个操作都成功后才更新UI状态
        setIsSslCertificateEditing(false);
        setShowAlert(true);
        setAlertType("success")
        setAlertMessage(_("Save Success"));

        // 重新初始化以获取最新状态
        init();
      } catch (sslConfigError) {
        // 如果ssl_cert保存成功但ssl_key保存失败，需要回滚ssl_cert
        if (sslCertSuccess && originalSslCertPath !== null) {
          try {
            await SetSettings("nginx_proxy_manager", { key: "ssl_cert", value: originalSslCertPath });
            console.log("SSL cert configuration rolled back successfully");
          } catch (rollbackError) {
            console.error("Failed to rollback SSL cert configuration:", rollbackError);
            // 回滚失败，需要提示用户手动检查配置
            throw new Error(_("Failed to save SSL configuration and rollback failed. Please check your SSL settings manually."));
          }
        }

        // 抛出原始错误
        throw new Error(_("Failed to save SSL certificate configuration: ") + sslConfigError.message);
      }
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
    let sslCertPath = null;

    try {
      const settingsResponse = await GetSettings();
      setApikey(settingsResponse?.api_key?.key || "");
      setCockpitPort(settingsResponse?.nginx_proxy_manager?.listen_port.toString() || "");
      setWildcardDomain(settingsResponse?.domain?.wildcard_domain || "");

      // 保存ssl_cert路径，稍后用于设置默认选择
      sslCertPath = settingsResponse?.nginx_proxy_manager?.ssl_cert;

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

    //获取SSL证书列表
    await getSslCertificates(sslCertPath);
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
                      <Col style={{ flex: "0 0 10%" }}>
                        <IconButton title='reset' onClick={() => setShowConform(true)}>
                          <RefreshIcon />
                        </IconButton>
                      </Col>
                      <Col style={{ flex: "0 0 30%" }}>
                        <span style={{ fontStyle: "italic", marginLeft: "10px", color: "green" }}>{_("Reset may cause API calls to fail, please be cautious.")}</span>
                      </Col>
                    </Row>
                    <Row className="mb-4 d-flex align-items-center">
                      <Col style={{ textAlign: "right", flex: "0 0 10%" }}>
                        <span>{_("SSL Certificate")}{" ："}</span>
                      </Col>
                      <Col>
                        <FormControl fullWidth size="small">
                          <Select
                            value={selectedCertificate}
                            onChange={(event) => setSelectedCertificate(event.target.value)}
                            displayEmpty
                            disabled={!isSslCertificateEditing}
                          >
                            <MenuItem value={JSON.stringify({ id: -1, provider: "system-default" })}>
                              <em>{_("System Default(websoft9-inner)")}</em>
                            </MenuItem>
                            {sslCertificates.map((cert) => (
                              <MenuItem key={cert.id} value={JSON.stringify({ id: cert.id, provider: cert.provider })}>
                                {cert.nice_name} - {_("Expires")}: {language === "zh_CN"
                                  ? new Date(cert.expires_on).toLocaleDateString('zh-CN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                  })
                                  : new Date(cert.expires_on).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                }
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Col>
                      <Col style={{ flex: "0 0 10%" }}>
                        {isSslCertificateEditing ? (
                          <>
                            <IconButton title='Save' onClick={handlerSslCertificateSave}>
                              <SaveIcon />
                            </IconButton>
                            <IconButton title='Cancel' onClick={() => {
                              setIsSslCertificateEditing(false);
                              setSelectedCertificate(originalSelectedCertificate);
                            }}>
                              <CancelIcon />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton title='Edit' onClick={() => {
                            setIsSslCertificateEditing(true);
                            setOriginalSelectedCertificate(selectedCertificate);
                          }}>
                            <EditIcon />
                          </IconButton>
                        )}
                      </Col>
                      <Col style={{ flex: "0 0 30%" }}>
                        <span style={{ fontStyle: "italic", marginLeft: "10px", color: "green" }}>{_("Please generate or upload certificates in the gateway first.")}</span>
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
                          <span style={{ color: "green" }}>
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
          {_("Current Version")}{"："} <span style={{ color: "green" }}>{" "}{currentVersion}</span>
        </Col>
      </Row>

      <ResetApiKeyConform showConform={showConform} onClose={() => setShowConform(false)} refreshData={() => init()} showFatherAlert={showFatherAlert} />
      {
        showAlert &&
        <Snackbar open={showAlert} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <MyMuiAlert onClose={handleClose} severity={alertType} sx={{ width: '100%' }}>
            {alertMessage}
          </MyMuiAlert>
        </Snackbar>
      }
    </>
  );
}

export default App;
