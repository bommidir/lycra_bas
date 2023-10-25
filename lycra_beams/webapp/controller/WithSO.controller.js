sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"

],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController, MessageBox, Fragment, JSONModel) {
        "use strict";

        return BaseController.extend("com.lycrabeams.controller.WithSO", {
            onInit: function () {
                sap.ui.core.BusyIndicator.hide();
                this.oDataModel = this.getOwnerComponent().getModel();
                // Reading the local model
                this.oModel = this.getOwnerComponent().getModel("SOModel");
                this.oModel.dataLoaded().then(this.jsonModelLoaded.bind(this));
                this.oLocalEventBus = this.getOwnerComponent().getEventBus();
                this.oLocalEventBus.subscribe("WithSO", "FocusSOInput", jQuery.proxy(this.onFocusSOInput, this), this);

                this.getRouter().getRoute("WithSO").attachPatternMatched(this._onObjectMatched, this);

                //////////////
                if (!this._oMsgDialog) {
                    this._oMsgDialog = sap.ui.xmlfragment(
                        "com.lycrabeams.Fragments.MessageDialog", this);
                    //that.getView().getModel("withSOModel").updateBindings();
                    this.getView().addDependent(this._oMsgDialog);
                }
            },

            onFocusSOInput: function () {
                var oInputShipment = this.getView().byId("idIpSONum"),
                    oInputHU = this.getView().byId("idIpBarcodeNum");

                if (oInputShipment && oInputShipment.getValue() === "") {
                    setTimeout(function () {
                        oInputShipment.focus();
                    }.bind(this), 500);
                }
                else {
                    setTimeout(function () {
                        oInputHU.focus();
                    }.bind(this), 500);
                }
                /*else if (oInputHU && oInputHU.getValue() === ""){
                    setTimeout(function(){
                        oInputHU.focus();
                    }.bind(this),500);	
                }*/
            },

            onAfterRendering: function (oEvent) {
                this.onFocusSOInput();
            },

            jsonModelLoaded: function () {
                this.getView().setModel(this.oModel, "withSOModel");
            },

            _onObjectMatched: function () {
                this.visibilityGlobalFields();
            },

            //** Trigger on route matched ***//
            visibilityGlobalFields: function () {
                var oIpFocusSONum = this.getView().byId("idIpSONum").setValue(""),
                    oFocusBarcode = this.getView().byId("idIpBarcodeNum").setValue("");
                this.getView().getModel("withSOModel").setProperty("/SOCustNum", "");
                this.getView().getModel("withSOModel").setProperty("/CustName", "");
                this.getView().getModel("withSOModel").setProperty("/BarcodeCount", 0);
                this.getView().getModel("withSOModel").setProperty("/BarcodeTable", []);
                this.oMsg = false;
                this.getView().getModel("withSOModel").setProperty("/SubmitEnabled", false);
                this._onChangeInputState(oIpFocusSONum, "None", "");
                this._onChangeInputState(oFocusBarcode, "None", "");
                this.onFocusSOInput();
            },

            onNavBtnWithSO: function () {
                this.getRouter().navTo("RouteApp");
            },

            //****Method  to validate SO Number
            onChangeSOInput: function (oEvent, SOId) {
                var oInput = oEvent.getSource();
                this.oSoNum = this.getView().byId(SOId).getValue().trim();
                if (this.oSoNum) {
                    this.SoNumValidate(oEvent, this.oSoNum);
                } else {
                    oInput.setValueState("None");
                    this.getView().getModel("withSOModel").setProperty("/SOCustNum", "");
                    this.getView().getModel("withSOModel").setProperty("/CustName", "");
                }
            },

            //****Method  to validate SO Number
            SoNumValidate: function (oEvent, SONumber) {
                this.setBussy(true);
                var oInputState = oEvent.getSource();
                if (SONumber.length <= 10 && !(isNaN(SONumber))) {
                    oInputState.setValueState("None");
                    this.SONumValidCall(oEvent, SONumber);
                } else {
                    this.setBussy(false);
                    oInputState.setValueState("Error");
                    this.getView().getModel("withSOModel").setProperty("/SOCustNum", "");
                    this.getView().getModel("withSOModel").setProperty("/CustName", "");
                }
            },

            //**** Method to trigger OData validate the SO Number
            SONumValidCall: function (oEvent, SONumber) {
                var that = this;
                var oInput = oEvent.getSource();
                this.oDataModel.read("/SoValidateSet('" + SONumber + "')", {
                    success: function (oData, Responce) {
                        this.setBussy(false);
                        if (!oData.Kunnr) {
                            oInput.setValueState("Error");
                            this.getView().getModel("withSOModel").setProperty("/SOCustNum", "");
                            this.getView().getModel("withSOModel").setProperty("/CustName", "");
                            this.getView().getModel("withSOModel").setProperty("/BarcodeCount", 0);
                            this.getView().getModel("withSOModel").setProperty("/BarcodeTable", []);
                        } else {
                            oInput.setValueState("None");
                            this.getView().getModel("withSOModel").setProperty("/SOCustNum", oData.Kunnr);
                            this.getView().getModel("withSOModel").setProperty("/CustName", oData.Name1);
                            this.onFocusSOInput();
                        }
                    }.bind(this),

                    error: function (oError) {
                        that.setBussy(false);
                        oInput.setValueState("Error");
                        MessageBox.error(JSON.parse(oError.responseText).error.message.value);
                    }
                });
            },

            onBarcodenScan: function (oEvent) {
                this._onScan().then(function (scannedVal) {
                    if (scannedVal) {
                        this.getView().getModel("withSOModel").setProperty("/BarcodeNum", scannedVal);
                        this.onValidateBarcode();
                    }
                }.bind(this)).catch(function (oError) {
                    MessageBox.error(this.getText("SCANNER_ERROR"), {
                        details: oError
                    });
                    this.getView().getModel("withSOModel").setProperty("/BarcodeNum", "");
                }.bind(this));
            },

            onValidateBarcode: function () {
                var that = this;
                var oInputBarcodeNum = this.getView().byId("idIpBarcodeNum"),
                    oBarcodeIp = oInputBarcodeNum.getValue().toUpperCase().trim();

                if (!oBarcodeIp) {
                    this._onChangeInputState(oInputBarcodeNum, "Error", "ENTER_BARCODE_NUM");
                    //this.getView().getModel("withSOModel").setProperty("/MessageBoxOpen", true);
                    MessageBox.error(this.getResourceBundle().getText("ENTER_BARCODE_NUM"), {
                        onClose: function (oAction) {
                            //this.getView().getModel("withSOModel").setProperty("/MessageBoxOpen", false);
                            oInputBarcodeNum.focus();
                        }.bind(this)
                    });
                    return;
                }

                this.setBussy(true);
                if (oBarcodeIp) {
                    this.getView().getModel("withSOModel").setProperty("/InputToFocus", oInputBarcodeNum); //for focusing in case of error
                    this.oDataModel.read("/CheckBarcodeSet('" + oBarcodeIp + "')", {
                        success: function (oData, oError) {
                            this.setBussy(false);
                            this.getView().getModel("withSOModel").setProperty("/InputToFocus", null);
                            this._onChangeInputState(oInputBarcodeNum, "None", "");
                            if (oData.Valid === 'X') {
                                this.oTabData = that.getView().getModel("withSOModel").getProperty("/BarcodeTable");
                                if (this.oTabData.length === 0) {
                                    this.oTabData.push({ Barcode: oData.Barcode });
                                } else {
                                    for (var i = 0; i < that.oTabData.length; i++) {
                                        if (that.oTabData[i].Barcode === oData.Barcode) {
                                            MessageBox.error(that.getResourceBundle().getText("DUPLICATE_BARCODE"), {
                                                onClose: function (oAction) {
                                                    that.getView().getModel("withSOModel").setProperty("/BarcodeNum", "");
                                                    //that.getView().getModel("withSOModel").setProperty("/MessageBoxOpen", false);
                                                    oInputBarcodeNum.focus();
                                                }.bind(this)
                                            });
                                            return;
                                        }
                                    }
                                    that.oTabData.push({ Barcode: oData.Barcode });
                                }

                                that.getView().getModel("withSOModel").setProperty("/BarcodeTable", that.oTabData);
                                var oBCount = that.getView().getModel("withSOModel").getProperty("/BarcodeCount");
                                var barcodeCountScnd = Number(oBCount + 1);
                                that.getView().getModel("withSOModel").setProperty("/BarcodeCount", barcodeCountScnd);
                                that.getView().getModel("withSOModel").setProperty("/BarcodeNum", "");
                                that.getView().getModel("withSOModel").setProperty("/SubmitEnabled", true);
                                that.getView().getModel("withSOModel").refresh(true);
                            } else {
                                this.setBussy(false);
                                MessageBox.error(this.getResourceBundle().getText("SACAN_VALID_BARCODE"), {
                                    onClose: function (oAction) {
                                        this.getView().getModel("withSOModel").setProperty("/BarcodeNum", "");
                                        //this.getView().getModel("withSOModel").setProperty("/MessageBoxOpen", false);
                                        oInputBarcodeNum.focus();
                                    }.bind(this)
                                });
                                return;
                            }
                        }.bind(this),
                        error: function (oError) {
                            that.setBussy(false);
                            that.getView().getModel("withSOModel").setProperty("/InputToFocus", null);
                            that._onChangeInputState(oInputBarcodeNum, "Error", "SACAN_VALID_BARCODE");
                            MessageBox.error(that.getResourceBundle().getText("SACAN_VALID_BARCODE"), {
                                onClose: function (oAction) {
                                    that.getView().getModel("withSOModel").setProperty("/BarcodeNum", "");
                                    //this.getView().getModel("withSOModel").setProperty("/MessageBoxOpen", false);
                                    oInputBarcodeNum.focus();
                                }.bind(this)
                            });
                            return;
                        }
                    });
                } else {
                    this.setBussy(false);
                    this._onChangeInputState(oInputBarcodeNum, "None", "");
                }
            },

            //****Method to delete Barcode Number from the table
            onDelTblRow: function (oEvt) {
                var that = this;
                this.oIpBarcode = this.getView().byId("idIpBarcodeNum");
                this.selPath = oEvt.getSource().getParent().getBindingContext("withSOModel").getPath().split("/")[2];
                MessageBox.confirm(this.getResourceBundle().getText("DEL_BARCODE"), {
                    actions: [MessageBox.Action.OK, MessageBox.Action.CLOSE],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (sActionbtn) {
                        if (sActionbtn == "OK") {
                            // var oTable = that.getView().byId("idTab");
                            // var oSelectedItem = oTable.getBinding("items");
                            // var oIndex = oTable.indexOfItem(oSelectedItem);                            
                            //if (that.selPath) {
                            var barcodeCt = that.getView().getModel("withSOModel").getProperty("/BarcodeCount");
                            var barcodeCount = Number(barcodeCt - 1);
                            if (barcodeCount === 0) {
                                that.getView().getModel("withSOModel").setProperty("/SubmitEnabled", false);
                                that._onChangeInputState(that.oIpBarcode, "None", "");
                                setTimeout(function () {
                                    that.oIpBarcode.focus();
                                }.bind(this), 0);
                            }
                            that.getView().getModel("withSOModel").setProperty("/BarcodeCount", barcodeCount);
                            //}
                            //that.getView().getModel("withSOModel").getProperty("/BarcodeTable").splice(oIndex, 2)
                            that.getView().getModel("withSOModel").getProperty("/BarcodeTable").splice(that.selPath, 1);
                            that.getView().getModel("withSOModel").refresh(true);
                        }
                    }
                });
            },

            //On click of Reset button, SO Num, Cust Num, Barcode data will be erased
            onReset: function () {
                var oIpSoNum = this.getView().byId("idIpSONum"),
                    oInpBarcode = this.getView().byId("idIpBarcodeNum");
                this.getView().byId("idIpSONum").setValue("");
                this.getView().getModel("withSOModel").setProperty("/SOCustNum", "");
                this.getView().getModel("withSOModel").setProperty("/CustName", "");
                this.getView().getModel("withSOModel").setProperty("/BarcodeNum", "");
                this.getView().getModel("withSOModel").setProperty("/BarcodeCount", 0)
                this.getView().getModel("withSOModel").setProperty("/BarcodeTable", []);
                this.getView().getModel("withSOModel").setProperty("/SubmitEnabled", false);
                this.getView().getModel("withSOModel").refresh(true);
                this._onChangeInputState(oIpSoNum, "None", "");
                this._onChangeInputState(oInpBarcode, "None", "");
                setTimeout(function () {
                    oIpSoNum.focus();
                }.bind(this), 0);
            },

            dialogOK: function (oEvt) {
                if (this._oMsgDialog) {
                    if (this.oMsg === true) {
                        this._oMsgDialog.close();
                        this.getRouter().navTo("RouteApp");
                        this.getView().getModel("withSOModel").setProperty("/SOCustNum", "");
                        this.getView().getModel("withSOModel").setProperty("/CustName", "");
                        this.getView().byId("idIpSONum").setValue("");
                        this.getView().getModel("withSOModel").refresh(true);
                    } else {
                        this._oMsgDialog.close();
                        this.getView().getModel("withSOModel").refresh(true);
                    }
                }
            },

            onSubmit: function () {
                var that = this;
                MessageBox.confirm(this.getResourceBundle().getText("SUBMIT_BARCODE"), {
                    actions: [MessageBox.Action.OK, "CANCEL"],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (sActionbtn) {
                        if (sActionbtn === "OK") {
                            sap.ui.core.BusyIndicator.show();
                            var data = that.getView().getModel("withSOModel").getProperty("/BarcodeTable");
                            for (var i = 0; i < data.length; i++) {
                                var seqNum = i + 1;
                                data[i].Sequency = seqNum.toString();
                                data[i].Vbeln = that.getView().byId("idIpSONum").getValue();
                            }

                            var Payload = {
                                "Vbeln": that.getView().byId("idIpSONum").getValue(),
                                "Kunnr": "",
                                "Cifcount": "",
                                "NavBarcodeScan": data,
                                "NavReturnMsg": []
                            };

                            that.oDataModel.create("/SoValidateSet", Payload, {
                                success: function (req, res) {
                                    // if(res.data.NavReturnMsg === null){
                                    //     sap.ui.core.BusyIndicator.hide();
                                    //     MessageBox.error("Please enter SO / STO Number");
                                    //     return;
                                    // }
                                    var msgResult = res.data.NavReturnMsg.results[0];
                                    if (msgResult.Type === "E") {
                                        sap.ui.core.BusyIndicator.hide();
                                        MessageBox.error(msgResult.Message);                                       
                                    } else {
                                        sap.ui.core.BusyIndicator.hide();
                                        //MessageBox.success(that.errorMsg);
                                        MessageBox.success(msgResult.Message, {
                                            onClose: function () {
                                                that.getRouter().navTo("RouteApp");
                                            }
                                        });
                                    }
                                    // var aMsgArr = [];
                                    // for (var j = 0; j < res.data.NavReturnMsg.results.length; j++) {
                                    //     if (res.data.NavReturnMsg.results[j].Type === "E") {
                                    //         sap.ui.core.BusyIndicator.hide();
                                    //         that.oMsg = false;
                                    //         aMsgArr.push(res.data.NavReturnMsg.results[j]);
                                    //         var msgDialogId = sap.ui.getCore().byId("myDialog");
                                    //         msgDialogId.setModel(new JSONModel(aMsgArr), "BarcodeMsgData");
                                    //         that._oMsgDialog.open();
                                    //     } else {
                                    //         sap.ui.core.BusyIndicator.hide();
                                    //         that.oMsg = true;
                                    //         aMsgArr.push(res.data.NavReturnMsg.results[j]);
                                    //         var msgDialogId = sap.ui.getCore().byId("myDialog");
                                    //         msgDialogId.setModel(new JSONModel(aMsgArr), "BarcodeMsgData");
                                    //         that._oMsgDialog.open();
                                    //     }
                                    // }
                                }.bind(this),
                                error: function (oError) {
                                    sap.ui.core.BusyIndicator.hide();
                                    MessageBox.error(JSON.parse(oError.responseText).error.message.value);
                                }
                            });
                        }
                    }
                });
            }
        });
    });
