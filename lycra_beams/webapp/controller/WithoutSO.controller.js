sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController, MessageBox, JSONModel, Fragment) {
        "use strict";

        return BaseController.extend("com.lycra.beamsracksapp.controller.WithoutSO", {
            onInit: function () {
                this.oDataModel = this.getOwnerComponent().getModel();
                this.oModel = this.getOwnerComponent().getModel("SOModel");
                this.oModel.dataLoaded().then(this.jsonModelLoaded.bind(this));
                this.oLocalEventBus = this.getOwnerComponent().getEventBus();
                this.oLocalEventBus.subscribe("WithoutSO", "FocusCSOInput", jQuery.proxy(this.onFocusCSOInput, this), this);
                this.getRouter().getRoute("WithoutSO").attachPatternMatched(this._onObjectMatched, this);
                ////// Method to open Fragment
                if (!this._oMsgDialogCust) {
                    this._oMsgDialogCust = sap.ui.xmlfragment(
                        "com.lycrabeams.Fragments.CustMessageDialog", this);
                    //that.getView().getModel("withSOModel").updateBindings();
                    this.getView().addDependent(this._oMsgDialogCust);
                }
            },

            onFocusCSOInput: function () {
                var oInputCustNum = this.getView().byId("idIpCustNum"),
                    oInputCustBarCode = this.getView().byId("idIpCustBarcodeNum");

                if (oInputCustNum && oInputCustNum.getValue() === "") {
                    setTimeout(function () {
                        oInputCustNum.focus();
                    }.bind(this), 500);
                }
                else {
                    setTimeout(function () {
                        oInputCustBarCode.focus();
                    }.bind(this), 500);
                }
                /*else if (oInputCustBarCode && oInputCustBarCode.getValue() === ""){
                    setTimeout(function(){
                        oInputCustBarCode.focus();
                    }.bind(this),500);	
                }*/
            },

            onAfterRendering: function (oEvent) {
                this.onFocusCSOInput();
            },

            jsonModelLoaded: function () {
                this.getView().setModel(this.oModel, "CustModel");
            },

            _onObjectMatched: function () {
                this.visibilityGlobalFields();
            },

            //** Trigger on route matched ***//
            visibilityGlobalFields: function () {
                this.getView().getModel("CustModel").setProperty("/CustName", "");
                this.getView().getModel("CustModel").setProperty("/CustBarcodeCount", 0);
                //this.getView().getModel("CustModel").setProperty("/CustBarcodeNum", "");
                this.getView().getModel("CustModel").setProperty("/CustBarcodeTable", []);
                this.getView().getModel("CustModel").setProperty("/SubmitEnabled", false);
                this.oMsgFlag = false;
                var oIpCustNumFocus = this.getView().byId("idIpCustNum").setValue(""),
                    oBarcodeNumFocus = this.getView().byId("idIpCustBarcodeNum").setValue("");
                this._onChangeInputState(oIpCustNumFocus, "None", "");
                this._onChangeInputState(oBarcodeNumFocus, "None", "");
                this.onFocusCSOInput();
            },

            ////// Customer Validation
            onChangeCustInput: function (oEvent, custId) {
                var oInput = oEvent.getSource();
                this.oCustNum = this.getView().byId(custId).getValue().trim();
                if (this.oCustNum) {
                    this.CustNumValidate(oEvent, this.oCustNum);
                } else {
                    oInput.setValueState("None");
                }
            },

            //****Method to validate Customer Number
            CustNumValidate: function (oEvent, customerNum) {
                sap.ui.core.BusyIndicator.show();
                var oInputState = oEvent.getSource();
                var regex = /^[0-9a-zA-Z]+$/; // /^[a-z0-9]+$/i; //"^[0-9a-zA-Z_\. ]+$"; // /^[0-9a-zA-Z(\-)]+$/;
                //if (customerNum.length <= 10 && !(isNaN(customerNum))) {
                if (customerNum.length <= 10 && (customerNum.match(regex))) {
                    oInputState.setValueState("None");
                    this.CustNumValidCall(oEvent, customerNum);
                } else {
                    sap.ui.core.BusyIndicator.hide();
                    oInputState.setValueState("Error");
                }
            },

            CustNumValidCall: function (oEvent, CustomerNum) {
                var that = this;
                var oInput = oEvent.getSource();
                this.oDataModel.read("/CustValidateSet(Kunnr='" + CustomerNum + "')", {
                    success: function (oData, Responce) {
                        sap.ui.core.BusyIndicator.hide();
                        if (!oData.Name1) {
                            oInput.setValueState("Error");
                            that.getView().getModel("CustModel").setProperty("/CustName", "");
                            that.getView().getModel("CustModel").setProperty("/CustBarcodeCount", 0);
                            that.getView().getModel("CustModel").setProperty("/CustBarcodeTable", []);
                        } else {
                            oInput.setValueState("None");
                            that.getView().getModel("CustModel").setProperty("/CustName", oData.Name1);
                            this.onFocusCSOInput();
                        }
                    }.bind(this),
                    error: function (oError) {
                        sap.ui.core.BusyIndicator.hide();
                        oInput.setValueState("Error");
                        MessageBox.error(JSON.parse(oError.responseText).error.message.value);
                    }
                });
            },

            onCustBarcodeCam: function (oEvent) {
                this._onScan().then(function (scannedVal) {
                    this.getView().getModel("CustModel").setProperty("/CustBarcodeNum", scannedVal);
                    this.onCustBarcodeScanBtn();
                }.bind(this)).catch(function (oError) {
                    //this.getView().getModel("CustModel").setProperty("/MessageBoxOpen", true);
                    MessageBox.error(this.getText("SCANNER_ERROR"), {
                        details: oError,
                        onClose: function (oAction) {
                            // this.getView().getModel("CustModel").setProperty("/MessageBoxOpen", false);
                        }.bind(this)
                    });
                }.bind(this));
            },

            onCustBarcodeScanBtn: function () {
                var that = this;
                var oInputBarcode = this.getView().byId("idIpCustBarcodeNum"),
                    oBarcode = oInputBarcode.getValue().toUpperCase().trim();

                if (!oBarcode) {
                    this._onChangeInputState(oInputBarcode, "Error", "ENTER_BARCODE_NUM");
                    MessageBox.error(this.getResourceBundle().getText("ENTER_BARCODE_NUM"), {
                        onClose: function (oAction) {
                            oInputBarcode.focus();
                        }.bind(this)
                    });
                    return;
                }
                this.setBussy(true);
                if (oBarcode) {
                    this.getView().getModel("CustModel").setProperty("/InputToFocus", oInputBarcode); //for focusing in case of error
                    this.oDataModel.read("/CheckBarcodeSet('" + oBarcode + "')", {
                        success: function (oData, oError) {
                            this.setBussy(false);
                            this.getView().getModel("CustModel").setProperty("/InputToFocus", null);
                            this._onChangeInputState(oInputBarcode, "None", "");
                            if (oData.Valid === 'X') {
                                this.oTabData = that.getView().getModel("CustModel").getProperty("/CustBarcodeTable");
                                if (this.oTabData.length === 0) {
                                    this.oTabData.push({ Barcode: oData.Barcode });
                                } else {
                                    for (var i = 0; i < that.oTabData.length; i++) {
                                        if (that.oTabData[i].Barcode === oData.Barcode) {
                                            MessageBox.error(that.getResourceBundle().getText("DUPLICATE_BARCODE"), {
                                                onClose: function (oAction) {
                                                    that.getView().getModel("CustModel").setProperty("/CustBarcodeNum", "");
                                                    oInputBarcode.focus();
                                                }.bind(this)
                                            });
                                            return;
                                        }
                                    }
                                    that.oTabData.push({ Barcode: oData.Barcode });
                                }

                                that.getView().getModel("CustModel").setProperty("/CustBarcodeTable", that.oTabData);
                                var bCount = that.getView().getModel("CustModel").getProperty("/CustBarcodeCount");
                                var barcodeCount = Number(bCount + 1);
                                that.getView().getModel("CustModel").setProperty("/CustBarcodeCount", barcodeCount);
                                that.getView().getModel("CustModel").setProperty("/CustBarcodeNum", "");
                                that.getView().getModel("CustModel").setProperty("/SubmitEnabled", true);
                                that.getView().getModel("CustModel").refresh(true);
                            } else {
                                this.setBussy(false);
                                MessageBox.error(this.getResourceBundle().getText("SACAN_VALID_BARCODE"), {
                                    onClose: function (oAction) {
                                        this.getView().getModel("CustModel").setProperty("/CustBarcodeNum", "");
                                        oInputBarcode.focus();
                                    }.bind(this)
                                });
                                return;
                            }
                        }.bind(this),
                        error: function (oError) {
                            that.setBussy(false);
                            that.getView().getModel("CustModel").setProperty("/InputToFocus", null);
                            that._onChangeInputState(oInputBarcode, "Error", "SACAN_VALID_BARCODE");
                            MessageBox.error(that.getResourceBundle().getText("SACAN_VALID_BARCODE"), {
                                onClose: function (oAction) {
                                    that.getView().getModel("CustModel").setProperty("/CustBarcodeNum", "");
                                    oInputBarcode.focus();
                                }.bind(this)
                            });
                            return;
                        }
                    });
                } else {
                    this.setBussy(false);
                    this._onChangeInputState(oInputBarcode, "None", "");
                }
            },

            //****Method to delete Barcode Number from the table
            onDelTblRow: function (oEvt) {
                var that = this;
                this.oInputBarcode = this.getView().byId("idIpCustBarcodeNum");
                this.selBarcodePath = oEvt.getSource().getParent().getBindingContext("CustModel").getPath().split("/")[2];
                MessageBox.confirm(this.getResourceBundle().getText("DEL_BARCODE"), {
                    actions: [MessageBox.Action.OK, MessageBox.Action.CLOSE],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (sActionbtn) {
                        if (sActionbtn == "OK") {
                            // var oTable = that.getView().byId("idCustTable");
                            // var oSelectedItem = oTable.getBinding("items");
                            // var oIndex = oTable.indexOfItem(oSelectedItem);
                            //if (oIndex) {
                                var barcodeCt = that.getView().getModel("CustModel").getProperty("/CustBarcodeCount");
                                var barcodeCount = Number(barcodeCt - 1);
                                if (barcodeCount === 0) {
                                    that.getView().getModel("CustModel").setProperty("/SubmitEnabled", false);
                                    that._onChangeInputState(that.oInputBarcode, "None", "");
                                    setTimeout(function () {
                                        that.oInputBarcode.focus();
                                    }.bind(this), 0);
                                }
                                that.getView().getModel("CustModel").setProperty("/CustBarcodeCount", barcodeCount);
                            //}
                            //that.getView().getModel("CustModel").getProperty("/CustBarcodeTable").splice(oIndex, 2);
                            that.getView().getModel("CustModel").getProperty("/CustBarcodeTable").splice(that.selBarcodePath, 1);
                            
                            that.getView().getModel("CustModel").refresh(true);
                        }
                    }
                });
            },

            //On click of Reset button, SO Num, Cust Num, Barcode data will be erased
            onReset: function () {
                var oIpCustNumFocus = this.getView().byId("idIpCustNum"),
                    oBarcodeNumFocus = this.getView().byId("idIpCustBarcodeNum");
                this.getView().byId("idIpCustNum").setValue("");
                this.getView().getModel("CustModel").setProperty("/CustBarcodeCount", "");
                this.getView().getModel("CustModel").setProperty("/CustName", "");
                this.getView().getModel("CustModel").setProperty("/CustBarcodeCount", 0);
                this.getView().getModel("CustModel").setProperty("/CustBarcodeTable", []);
                this.getView().getModel("CustModel").setProperty("/SubmitEnabled", false);
                this.getView().getModel("CustModel").refresh(true);
                this._onChangeInputState(oIpCustNumFocus, "None", "");
                this._onChangeInputState(oBarcodeNumFocus, "None", "");
                setTimeout(function () {
                    oIpCustNumFocus.focus();
                }.bind(this), 0);
            },

            onSubmit: function () {
                var that = this;
                MessageBox.confirm(this.getResourceBundle().getText("SUBMIT_BARCODE"), {
                    actions: [MessageBox.Action.OK, "CANCEL"],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (sActionbtn) {
                        if (sActionbtn === "OK") {
                            sap.ui.core.BusyIndicator.show();
                            var data = that.getView().getModel("CustModel").getProperty("/CustBarcodeTable");
                            for (var i = 0; i < data.length; i++) {
                                var seqNum = i + 1;
                                data[i].Sequency = seqNum.toString();
                                data[i].Kunnr = that.getView().getModel("CustModel").getProperty("/CustNum");
                            }
                            var Payload = {
                                "Name1": "",
                                "Kunnr": that.getView().getModel("CustModel").getProperty("/CustNum"),
                                "Cifcount": "",
                                "NavCustBar": data,
                                "NavCustRet": []
                            };

                            that.oDataModel.create("/CustValidateSet", Payload, {
                                success: function (req, res) {
                                    var msgCustResult = res.data.NavCustRet.results[0];
                                    if (msgCustResult.Type === "E") {
                                        sap.ui.core.BusyIndicator.hide();
                                        MessageBox.error(msgCustResult.Message);                                       
                                    } else {
                                        sap.ui.core.BusyIndicator.hide();
                                        //MessageBox.success(that.errorMsg);
                                        MessageBox.success(msgCustResult.Message, {
                                            onClose: function () {
                                                that.getRouter().navTo("RouteApp");
                                            }
                                        });
                                    }

                                    // var aMsgArr = [];
                                    // for (var k = 0; k < res.data.NavCustRet.results.length; k++) {
                                    //     if (res.data.NavCustRet.results[k].Type === "E") {
                                    //         sap.ui.core.BusyIndicator.hide();
                                    //         that.oMsgFlag = false;
                                    //         aMsgArr.push(res.data.NavCustRet.results[k]);
                                    //         var msgDialogCustId = sap.ui.getCore().byId("myDialogCust");
                                    //         msgDialogCustId.setModel(new JSONModel(aMsgArr), "BarcodeMsgData");
                                    //         that._oMsgDialogCust.open();
                                    //     } else {
                                    //         sap.ui.core.BusyIndicator.hide();
                                    //         that.oMsgFlag = true;
                                    //         aMsgArr.push(res.data.NavCustRet.results[k]);
                                    //         var msgDialogCustId = sap.ui.getCore().byId("myDialogCust");
                                    //         msgDialogCustId.setModel(new JSONModel(aMsgArr), "BarcodeMsgData");
                                    //         that._oMsgDialogCust.open();
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
            },

            // *** Function Triggers for Closing the Fragment ***//
            dialogOK: function (oEvt) {

                if (this._oMsgDialogCust) {
                    if (this.oMsgFlag === true) {
                        this._oMsgDialogCust.close();
                        this.getRouter().navTo("RouteApp");
                        this.getView().getModel("CustModel").setProperty("/CustNum", "");
                        this.getView().getModel("CustModel").setProperty("/CustName", "");
                        this.getView().getModel("CustModel").setProperty("/CustBarcodeCount", "");
                        this.getView().byId("idIpCustBarcodeNum").setValue("");
                        this.getView().getModel("CustModel").refresh(true);
                    } else {
                        this._oMsgDialogCust.close();
                        this.getView().getModel("CustModel").refresh(true);
                    }
                }
            },

            onNavButtonPress: function () {
                this.getRouter().navTo("RouteApp");
            },

        });
    });
