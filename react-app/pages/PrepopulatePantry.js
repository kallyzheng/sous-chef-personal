import React from 'react';
import {
    BUTTON_BACKGROUND_COLOR,
    BACKGROUND_COLOR,
    ACTION_BUTTON_COLOR
} from '../common/SousChefColors'
import { StyleSheet, Text, View, TouchableOpacity,SafeAreaView, StatusBar,  } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { beginPantryFetch, editPantryItem, removePantryItem} from '../redux/actions/PantryAction';
import { connect } from 'react-redux';
import {DEFAULT_FONT} from '../common/SousChefTheme';
import ActionButton from 'react-native-action-button';
import Icon from 'react-native-vector-icons/Ionicons';
import { RkPicker } from 'react-native-ui-kitten';
import convert from 'convert-units';
import { SwipeListView } from 'react-native-swipe-list-view';

import firebase from 'react-native-firebase';


const defaultState = {
    addDialogVisible : false,
    newIngredient: "",
    newIngredientUnit: "",
    pickedValue: [{value: "1", key: 1}, ""],
    pickerVisible: false,
    unconventionalUnits: false,
    units: [],
    standardUnit: "",
    editIngredient: "",
    editPickerVisible: false
};

class PrepopulatePantry extends React.Component {
    static navigationOptions = {
        title:"Pantry Staples",
        headerVisible: true,
        headerTintColor: "white",
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
    }

    constructor(props) {
        super(props);
        this.state = defaultState;
    }

    componentWillMount() {
        this.props.beginPantryFetch(this.props.userID);
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

    editItem = () => {
        if (this.state.unconventionalUnits || this.state.pickedValue[1] == "") {
            editPantryItem(
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
            editPantryItem(
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

    render() {
        return (
            <View style={[styles.container]}>
                <View style={[styles.headerContainer]}>
                    <Text style={[styles.header]}>Items:</Text>
                </View>
                <SwipeListView
                    useFlatList
                    data={this.props.pantry}
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
                                <Text style={styles.text}>edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.backRightBtn, styles.backRightBtnRight]}
                                onPress={ _ => {
                                    this.closeRow(rowMap, data.index);
                                    removePantryItem(data.item.title, this.props.userID);
                                }}
                            >
                                <Text style={styles.text}>delete</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    keyExtractor={(item, index) => index.toString()}
                    rightOpenValue={-75}
                    leftOpenValue={75}
                />

                <ActionButton
                    buttonColor={BUTTON_BACKGROUND_COLOR}
                    onPress={() => {this.props.navigation.navigate('DiscoverRecipes');}}
                    renderIcon={active => {
                        return (
                            <Icon
                                name="md-arrow-round-forward"
                                style={styles.actionButtonIcon}
                            />
                        );
                    }}
                />

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
    text: {
        fontFamily: DEFAULT_FONT,
        fontWeight: 'bold',
        fontSize: 13,
        color: 'white',
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
})

const mapStateToProps = state => {
    return {
        pantry: state.pantry,
        userID: state.userInfo.userID
    }
}

export default connect(
    mapStateToProps,
    {
        beginPantryFetch: beginPantryFetch
    }
)(PrepopulatePantry);
