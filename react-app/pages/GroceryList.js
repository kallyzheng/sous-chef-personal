import React from 'react';
import { BUTTON_BACKGROUND_COLOR } from '../common/SousChefColors'
import { StyleSheet, Text, View, TouchableOpacity, Alert, SafeAreaView, StatusBar } from 'react-native';
import { beginGroceryListFetch, addGroceryListItem, editGroceryItem, removeGroceryListItem } from '../redux/actions/GroceryListAction';
import { connect } from 'react-redux';
import { DEFAULT_FONT } from '../common/SousChefTheme';
import ActionButton from 'react-native-action-button';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {
    RkTextInput,
    RkPicker,
    RkButton
} from 'react-native-ui-kitten';
import Dialog, {
    DialogFooter,
    SlideAnimation,
    DialogButton,
    DialogTitle,
    DialogContent
} from 'react-native-popup-dialog';
import convert from 'convert-units';
import {SwipeListView} from 'react-native-swipe-list-view';

import firebase from 'react-native-firebase';
import { addPantryItem } from '../redux/actions/PantryAction';


const defaultState = {
    addDialogVisible : false,
    newIngredient: "",
    newIngredientUnit: "",
    pickedValue: [{value: "1", key: 1}, ""],
    pickerVisible: false,
    unconventionalUnits: false,
    units: [],
    standardUnit: "",
    standardUnit: "",
    editIngredient: "",
    editPickerVisible: false
};

class GroceryList extends React.Component {
    static navigationOptions = {
        title:"Grocery List",
        headerVisible: true,
        headerTintColor: "white",
        headerLeft: null,
        headerTransparent:false,
        headerBackground:(
          <LinearGradient colors={['#17ba6b','#1d945b']} locations={[0.3,1]} style={{height:90}}>
                <SafeAreaView style={{flex:1 }}>
                    <StatusBar barStyle="light-content"/>
                </SafeAreaView>
          </LinearGradient>
        ),
        headerTitleStyle: {
            fontFamily: DEFAULT_FONT,
            fontSize: 25,
            textAlign: 'left',
        },
        drawerLabel: 'Grocery List'
    }

    constructor(props) {
        super(props);
        this.state = defaultState;
    }

    measurementData = [
        [{key: 1, value: "1"},
        {key: 2, value: "2"},
        {key: 3, value: "3"},
        {key: 4, value: "4"},
        {key: 5, value: "5"},
        {key: 6, value: "6"},
        {key: 7, value: "7"},
        {key: 8, value: "8"},
        {key: 9, value: "9"},
        {key: 10, value: "10"},],
        convert().possibilities("mass").concat(convert().possibilities("volume"))
    ];

    addItem = () => {
        if (this.state.unconventionalUnits || this.state.pickedValue[1] == "") {
            addGroceryListItem(
                this.state.newIngredient,
                parseInt(this.state.pickedValue[0].value),
                this.props.userID
            );
        } else {
            var unitAbbreviation = convert().list().filter((unitEntry) => {
                return unitEntry.singular.toLowerCase() === this.state.pickedValue[1].toLowerCase()
            })[0].abbr;
            var standardUnitAbbreviation = convert().list().filter((unitEntry) => {
                return unitEntry.singular.toLowerCase() === this.state.standardUnit.toLowerCase()
            })[0].abbr;
            addGroceryListItem(
                this.state.newIngredient,
                convert(parseInt(this.state.pickedValue[0].value)).from(unitAbbreviation).to(standardUnitAbbreviation),
                this.props.userID
            );
        }
        this.setState({
            addDialogVisible: false
        })
    }

    editItem = () => {
        if (this.state.unconventionalUnits) {
            editGroceryItem(
                this.state.editIngredient,
                parseInt(this.state.pickedValue[0].value),
                this.props.userID
            );
        } else {
            var unitAbbreviation = convert().list().filter((unitEntry) => {
                return unitEntry.singular.toLowerCase() === this.state.pickedValue[1].toLowerCase()
            })[0].abbr;
            var standardUnitAbbreviation = convert().list().filter((unitEntry) => {
                return unitEntry.singular.toLowerCase() === this.state.standardUnit.toLowerCase()
            })[0].abbr;
            editGroceryItem(
                this.state.editIngredient,
                convert(parseInt(this.state.pickedValue[0].value)).from(unitAbbreviation).to(standardUnitAbbreviation),
                this.props.userID
            );
        }
    }

    closeRow(rowMap, rowKey) {
		if (rowMap[rowKey]) {
			rowMap[rowKey].closeRow();
		}
    }

    fetchIngredientData(ingredient, callback) {
        firebase.firestore().collection("standardmappings").doc(ingredient.toLowerCase()).get().then((snapshot) =>{
            var unit = snapshot.get("unit");
            if (unit == undefined) {
                this.setState({
                    standardUnit: "",
                    units: [""],
                    unconventionalUnits: true,
                    pickedValue:[{key: 1, value: "1"}, ""]
                });
                callback();
                return;
            }
            var unitList = convert().list().filter((unitEntry) => {
                return unitEntry.singular.toLowerCase() === unit.toLowerCase()
            });
            var units = [];
            if (unitList.length == 0) {
                units = [unit];
            } else {
                var unitsPossibility = convert().from(unitList[0].abbr).possibilities();
                units = convert().list().filter((unit) => {
                    return unitsPossibility.includes(unit.abbr);
                }).map((value) => {
                    return value.singular.toLowerCase();
                });
            }
            this.setState({
                standardUnit: unit,
                units: units,
                unconventionalUnits: units.length == 1,
                pickedValue: [{key: 1, value: "1"}, unit.toLowerCase()]
            });
            callback();
        }).catch((reason) => {
            console.warn(reason);
        });
    }

    componentWillMount() {
        this.props.beginGroceryListFetch(this.props.userID);
    }

    render() {
        return (
            <View style={[styles.container]}>
                <View style={[styles.headerContainer]}>
                    <Text style={[styles.header]}>Items:</Text>
                </View>
                <SwipeListView
                    useFlatList
                    data={this.props.groceryList}
                    style={[styles.list]}
                    renderItem={({item}, rowMap) => {
                        return <View style={[styles.listItem]}>
                            <Text style={{padding: 10}}>
                                {item.amount} {item.unit} {item.title}
                            </Text>
                        </View>
                    }}
                    renderHiddenItem={ (data, rowMap) => (
                        <View style={styles.rowBack}>
                            <TouchableOpacity
                                style={[styles.backRightBtn, styles.backRightBtnLeft]}
                                onPress={ _ => {
                                    this.closeRow(rowMap, data.index);
                                    this.fetchIngredientData(data.item.title, () => {
                                        this.setState(previousState => {
                                            var roundedAmount = parseInt(parseFloat(data.item.amount));
                                            return {
                                                editIngredient: data.item.title,
                                                pickedValue: [
                                                    {
                                                        key: roundedAmount,
                                                        value: roundedAmount.toString()
                                                    },
                                                    previousState.pickedValue[1]
                                                ]
                                            }
                                        }, () => {
                                            this.setState({
                                                editPickerVisible: true
                                            })
                                        });
                                    });
                                }}
                            >
                                <View style={{alignItems:'center',}}>
                                    <Icon
                                        name="md-create"
                                        style={styles.actionButtonIcon}
                                    />
                                    <Text style={styles.text}>edit</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.backRightBtn, styles.backRightBtnRight]}
                                onPress={ _ => {
                                    this.closeRow(rowMap, data.index);
                                    removeGroceryListItem(data.item.title, this.props.userID);
                                }}
                            >
                                <View style={{alignItems:'center',}}>
                                    <Icon
                                        name="md-close"
                                        style={styles.actionButtonIcon}
                                    />
                                    <Text style={styles.text}>delete</Text>
                                </View>

                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.backRightBtn, styles.backLeftBtnRight]}
                                onPress={ _ => {
                                    this.closeRow(rowMap, data.index);
                                    firebase.firestore().collection("standardmappings").doc(data.item.title).get().then(ingredientSnapshot => {
                                        if (ingredientSnapshot.exists) {
                                            removeGroceryListItem(data.item.title, this.props.userID);
                                            addPantryItem(data.item.title, data.item.amount, this.props.userID);
                                        } else {
                                            Alert.alert(
                                                "Cannot Move to Pantry",
                                                "Custom ingredients that are not used in any recipes in Sous Chef cannot be added to your pantry.",
                                                [
                                                    {
                                                        text: "OK"
                                                    }
                                                ]
                                            );
                                        }
                                    })
                                }}
                            >
                                <Text style={styles.text}>move to pantry</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    keyExtractor={(item, index) => index.toString()}
                    rightOpenValue={-75}
                    leftOpenValue={150}
                />
                <ActionButton
                    buttonColor={BUTTON_BACKGROUND_COLOR}
                    renderIcon={active => {
                        if (!active)
                            return (
                                <Icon
                                    name="md-create"
                                    style={styles.actionButtonIcon}
                                />
                            );
                        else
                            return (
                                <Icon
                                    name="md-add"
                                    style={styles.actionButtonIcon}
                                />
                            );
                    }}
                >
                    <ActionButton.Item
                        buttonColor={'#1d945b'}
                        title="New Item"
                        onPress={
                        () => this.setState(
                            {addDialogVisible: true}
                        )
                    }>
                        <Icon
                            name="md-add"
                            style={styles.actionButtonIcon}
                        />
                    </ActionButton.Item>
                    <ActionButton.Item
                        buttonColor={'#ffc100'}
                        title="Move All To Pantry"
                        onPress={() => console.warn("move all to pantry tapped!")}
                    >
                        <Icon
                            name="md-nutrition"
                            style={styles.actionButtonIcon}
                        />
                    </ActionButton.Item>
                </ActionButton>
                <Dialog
                    width={0.8}
                    visible={this.state.addDialogVisible}
                    onTouchOutside={() => {
                        this.setState({ addDialogVisible: false });
                    }}
                    dialogTitle={
                        <DialogTitle
                            style={[styles.dialogTitleContainer]}
                            textStyle={[styles.dialogTitleText]}
                            title="Add Item"
                        />
                    }
                    footer={
                    <DialogFooter>
                        <DialogButton
                            style={[styles.dialogButtonContainer]}
                            textStyle={[styles.dialogButtonText]}
                            text="Cancel"
                            onPress={() => {
                                this.setState({
                                    addDialogVisible: false
                                });
                            }}
                        />
                        <DialogButton
                            style={[styles.dialogButtonContainer]}
                            textStyle={[styles.dialogButtonText]}
                            text="Add Item"
                            onPress={
                                () => {
                                    this.addItem();
                                }
                            }
                        />
                    </DialogFooter>
                    }
                    dialogAnimation={new SlideAnimation({
                        slideFrom: 'bottom',
                        useNativeDriver: true
                    })}
                >
                    <DialogContent>
                        <Text
                            style={[styles.popupHeader]}
                        >
                            Item Name:
                        </Text>
                        <RkTextInput
                            placeholder = "eggs"
                            labelStyle={styles.text}
                            style={styles.textInput}
                            onChangeText={
                                ingredient => {
                                    this.setState({
                                        newIngredient: ingredient
                                    });
                                    this.fetchIngredientData(ingredient, () => {});
                                }
                            }
                            value={this.state.newIngredient}
                        />
                        <Text style={[styles.popupHeader]}>
                            Quantity:
                        </Text>
                            <Text style={{fontFamily: DEFAULT_FONT, marginBottom: 10, fontSize: 15, fontWeight: 'bold', alignSelf:'center'}}>
                                {this.state.pickedValue[0].value}{" "}{this.state.pickedValue[1]}
                            </Text>
                            <RkButton
                                style={{backgroundColor: '#ffc100', width:140, alignSelf:'center'}}
                                contentStyle={{color: 'white'}}
                                onPress={
                                    () => this.setState({
                                        pickerVisible: true
                                    })
                                }
                            >
                                Change Quantity
                            </RkButton>
                    </DialogContent>
                </Dialog>
                <RkPicker
                    title='Select Amount'
                    data={(() => {
                        if (this.state.newIngredient == "" || this.state.units.length == 0) {
                            return this.measurementData
                        }
                        var arrayOfNumbers = new Array(100).fill(0).map(Number.call, Number);
                        var values = arrayOfNumbers.map((number) => {
                            return {key: number, value: number.toString()};
                        });
                        if (this.state.unconventionalUnits) {
                            return [
                                values
                            ];
                        } else {
                            return [
                                values,
                                this.state.units
                            ];
                        }
                    })()}
                    visible={this.state.pickerVisible}
                    selectedOptions={(() => {
                        return this.state.pickedValue
                    })()}
                    onConfirm={(data) => {
                        if (this.state.unconventionalUnits) {
                            var newValue = [data[0], this.state.pickedValue[1]];
                            this.setState({
                                pickedValue: newValue
                            });
                        } else {
                            this.setState({
                                pickedValue: data
                            })
                        }
                        this.setState(
                            {
                                pickerVisible: false
                            }
                        )
                    }}
                    onCancel={
                        () => this.setState({pickerVisible: false})
                    }
                />
                <RkPicker
                    title='Edit Amount'
                    data={(() => {
                        if (this.state.editIngredient == "" || this.state.units.length == 0) {
                            return this.measurementData
                        }
                        var arrayOfNumbers = new Array(100).fill(0).map(Number.call, Number);
                        var values = arrayOfNumbers.map((number) => {
                            return {key: number, value: number.toString()};
                        });
                        if (this.state.unconventionalUnits) {
                            return [
                                values
                            ];
                        } else {
                            return [
                                values,
                                this.state.units
                            ];
                        }
                    })()}
                    visible={this.state.editPickerVisible}
                    selectedOptions={(() => {
                        return this.state.pickedValue
                    })()}
                    onConfirm={(data) => {
                        var newValue = data;
                        if (this.state.unconventionalUnits) {
                            var newValue = [data[0], this.state.pickedValue[1]];
                        }
                        this.setState({
                            pickedValue: newValue,
                            editPickerVisible: false
                        }, () => {
                            this.editItem();
                        });
                    }}
                    onCancel={
                        () => this.setState({editPickerVisible: false})
                    }
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "column",
        justifyContent: "flex-start",
        backgroundColor: 'white',
        paddingBottom: 25
    },
    actionButtonIcon: {
        fontSize: 20,
        height: 22,
        color: 'white',
    },
    list: {
        flex: 1,
        flexDirection: "column",
    },
    popupHeader: {
        fontFamily: DEFAULT_FONT,
        fontSize: 20,
        fontWeight: 'bold',
        color: BUTTON_BACKGROUND_COLOR,
        padding: 5,
    },
    header: {
        fontFamily: DEFAULT_FONT,
        fontWeight: 'bold',
        color: BUTTON_BACKGROUND_COLOR,
        fontSize: 20,
        margin: 10,
    },
    headerContainer: {
        borderColor: "lightgrey",
        borderBottomWidth: 0.5
    },
    listItem: {
        flex: 1,
        height: 50,
        borderColor: "lightgrey",
        backgroundColor: 'white',
        borderBottomWidth: 0.25,
        justifyContent:'center',
    },
    dialogButtonContainer: {
        backgroundColor: '#1d945b'
    },
    dialogButtonText: {
        color: "white",
        fontFamily: DEFAULT_FONT,
        fontWeight: 'bold',
    },
    dialogTitleContainer: {
        backgroundColor: '#1d945b'
    },
    dialogTitleText: {
        color: "white",
        fontFamily: DEFAULT_FONT,
        fontSize: 20,
        fontWeight: 'bold',
    },
    rowBack: {
		alignItems: 'center',
		backgroundColor: '#DDD',
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingLeft: 15,
    },
    backRightBtn: {
		alignItems: 'center',
		bottom: 0,
		justifyContent: 'center',
		position: 'absolute',
		top: 0,
		width: 75
	},
	backRightBtnLeft: {
		backgroundColor: BUTTON_BACKGROUND_COLOR,
		right: 0
	},
	backRightBtnRight: {
		backgroundColor: 'red',
        left: 0
    },
    backLeftBtnRight: {
        backgroundColor: '#ffc100',
		left: 75
    },
    text: {
        fontFamily: DEFAULT_FONT,
        fontWeight: 'bold',
        fontSize: 13,
        color: 'white',
    },
    textInput:{
      fontFamily: DEFAULT_FONT,
      // fontWeight: 'bold',
      fontSize: 13,


    },
})

const mapStateToProps = state => {
    return {
        groceryList: state.groceryList,
        userID: state.userInfo.userID
    }
}

export default connect(
    mapStateToProps,
    {
        beginGroceryListFetch: beginGroceryListFetch
    }
)(GroceryList);
