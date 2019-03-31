import React from 'react';
import { BUTTON_BACKGROUND_COLOR } from '../common/SousChefColors'
import LinearGradient from 'react-native-linear-gradient';
import { StyleSheet, Text, View, TouchableOpacity,SafeAreaView,StatusBar } from 'react-native';
import { beginPantryFetch, addPantryItem, editPantryItem, removePantryItem } from '../redux/actions/PantryAction';
import { connect } from 'react-redux';
import { DEFAULT_FONT } from '../common/SousChefTheme';
import ActionButton from 'react-native-action-button';
import Icon from 'react-native-vector-icons/Ionicons';
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
import { addGroceryListItem } from '../redux/actions/GroceryListAction';


const math = require('mathjs');

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

const ingrMappings = firebase.firestore().collection('standardmappings');

class Pantry extends React.Component {
    static navigationOptions = {
        title:"Your Pantry",
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
        drawerLabel: 'Pantry'
    }

    constructor(props) {
        super(props);
        this.state = defaultState;
    }

    volumeUnits = ['cup', 'tablespoon', 'tsp', 'teaspoon', 'tbsp', 'liter', 'l', 'milliliter',
        'cups', 'tablespoons', 'teaspoons', 'liters', 'milliliters', 'ml',
        'pint', 'pints', 'quart', 'quarts', 'qt', 'gallon', 'gallons', 'gal',
        'fluid ounce', 'fluid ounces', 'fluid oz', 'fl oz'];
    weightUnits = ['oz', 'ounce', 'ounces', 'gram', 'grams', 'g', 'kg', 'kilo',
        'kilos', 'kilogram', 'kilograms', 'pound', 'pounds', 'lb', 'lbs'];
    itemUnits = ['carton', 'bag', 'package', 'container', 'whole',
        'box', 'loaf', 'dozen', 'bottle', 'jar', 'stick', 'cartons', 'bags',
        'packages', 'containers', 'boxes', 'loaves', 'bottles', 'jars',
        'sticks'];

    measurementUnits = this.volumeUnits.concat(this.weightUnits).concat(this.itemUnits);

    // Stop accepting words for numbers after and including "twenty-one"
    numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9',
        '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
    numberNames = ['one', 'two', 'three', 'four', 'five', 'six', 'seven',
        'eight', 'nine',
        'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
        'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

    manualConversions = {
        "fluid ounce": [6, "teaspoon"],
        "fluid ounces": [6, "teaspoon"],
        "fluid oz": [6, "teaspoon"],
        "fl oz": [6, "teaspoon"],
        "pound": [1, "lb"],
        "pounds": [1, "lb"],
        "kilo": [1, "kg"],
        "kilos": [1, "kg"],
        "tsp": [1, "teaspoon"],
        "tbsp": [1, "tablespoon"]
    };

    disallowedPunctuation = [', ', '- ', '. ', '; ', ': ']

    sanitize = (text) => {
        var result = text.trim().toLowerCase();
        this.disallowedPunctuation.forEach((item) => {
            result = result.replace(item, ' ');
        });
        return result;
    }

    parseQuantity = (tokens) => {
        var numberResult = null;
        if (parseFloat(tokens[0])) {
            numberResult = parseFloat(tokens[0]);
        }
        if (numberResult == null) {
            // Couldn't find an arabic numberal, try text up to "twenty"
            for (var i = 0; i < this.numberNames.length; i++) {
                var number = this.numberNames[i];
                if (tokens[0].indexOf(number) != -1) {
                    numberResult = parseInt(this.numbers[i]);
                    break;
                }
            }
        }
        if (numberResult == null) {
            // We couldn't find a number, assume it's 1
            numberResult = 1;
        }
        else {
            // We could find a number, remove it from tokens
            tokens.shift();
        }
        return numberResult;
    }

    parseUnits = (tokens) => {
        var unitIndex = -1;
        for (var i = 0; i < this.measurementUnits.length; i++) {
            var unit = this.measurementUnits[i];
            var rawUnits;
            for (var j = 0; j < tokens.length; j++) {
                var token = tokens[j];

                // Check for two-word units
                if (j < tokens.length - 1 && this.measurementUnits.indexOf(token + " " + tokens[j+1]) != -1) {
                    unitIndex = j;
                    rawUnits = token + " " + tokens[j+1];
                    break;
                }

                // Check for one-word units
                if (token == unit) {
                    unitIndex = j;
                    rawUnits = token;
                    break;
                }
            }
            if (unitIndex != -1) break;
        }

        if (unitIndex == -1) return "whole";

        // Ignore text before units
        tokens.splice(0, unitIndex + 1);

        return rawUnits;
    }

    addItem = () => {
        var text = this.state.newIngredient;
        text = text.replace(".", "");
        text = text.replace(":", "");
        text = text.replace(";", "");
        var tokens = text.split(" ");

        // First parse out the number on the left side, if any
        var number = this.parseQuantity(tokens);

        // Now find raw units, if any
        var rawUnits = this.parseUnits(tokens);

        // Now assume the rest of the tokens are the ingredient
        var ingredient;
        if (tokens.length) ingredient = tokens.join(" ");
        else ingredient = null;

        // If we missed a unit, we can see if the first word after the number
        // is the units, not part of the ingredient
        var backupUnits, backupIngredient;
        if (tokens.length >= 2) {
            backupUnits = tokens[0];
            tokens.shift();
            backupIngredient = tokens.join(" ");
        }

        if (ingredient == null) {
            console.warn("Didn't recognize this as a pantry item.");
            this.setState({
                addDialogVisible: false
            });
            return;
        }

        // Find ingredient in DB and figure out which units to store it in
        // Start with assuming the user tried units we're familiar with
        var standardUnits = null;
        firebase.firestore().collection("standardmappings").doc(ingredient).get().then((snapshot) =>{
            if (!snapshot.exists) {
                console.warn("Ingredient " + ingredient + " not found.");
            }
            else {
                standardUnits = snapshot.get("unit");
            }
        }).then(() => {
            var standardQuantity = null;
            try {
                if (standardUnits == null) {
                    throw "Ingredient not found";
                }
                // Perform the unit conversion assuming we know the units
                if (rawUnits == standardUnits) {
                    standardQuantity = number;
                }
                else {
                    // We might have to do a conversion. See if we can.
                    // First check if "from" units work with math.js
                    if (rawUnits in this.manualConversions) {
                        // These units don't work with math.js, use units that do
                        number *= this.manualConversions[rawUnits][0];
                        rawUnits = this.manualConversions[rawUnits][1];
                    }
                    // Now check if "to" units work with math.js
                    var standardQuantityMultiplier = 1;
                    if (standardUnits in this.manualConversions) {
                        // These units don't work with math.js
                        // Convert to recognizeable units and modify result at end
                        standardQuantityMultiplier = this.manualConversions[standardUnits][0];
                        standardUnits = this.manualConversions[standardUnits][1];
                    }
                    var conversion = math.unit(number + " " + rawUnits)
                        .toNumber(standardUnits);

                    standardQuantity = conversion / standardQuantityMultiplier;
                }
            }
            catch (err) {
                // These units aren't standard for pantries (e.g. clove).
                // We know we failed to recognize this unit of measurement.
                // Use backups and hope this random word is appropriate.
                if (backupUnits) {
                    firebase.firestore().collection("standardmappings").doc(backupIngredient).get().then((snapshot) =>{
                        if (!snapshot.exists) {
                            console.warn("Ingredient " + ingredient +
                                " not found.");
                        }
                        else {
                            standardUnits = snapshot.get("unit");
                        }
                    });

                    // The units match! (e.g. clove)
                    if (backupUnits == standardUnits) {
                        standardQuantity = number;
                        ingredient = backupIngredient;
                    }
                    else {
                        console.warn("Can't compare " + backupUnits +
                            " to " + standardUnits);
                    }
                }
            }

            if (standardQuantity) {
                // We successfully identified units for this ingredient
                addPantryItem(
                    ingredient,
                    standardQuantity,
                    this.props.userID
                );

                console.warn("Added '" + standardQuantity + "' '" + standardUnits + "' '" + ingredient + "'.");
            }
            else {
                // TODO: remove
                console.warn("Invalid input.");
            }
        });
    }

    componentWillMount() {
        this.props.beginPantryFetch(this.props.userID);
    }

    closeRow(rowMap, rowKey) {
		if (rowMap[rowKey]) {
			rowMap[rowKey].closeRow();
		}
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
                                    removePantryItem(data.item.title, this.props.userID);
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
                                    removePantryItem(data.item.title, this.props.userID);
                                    addGroceryListItem(data.item.title, data.item.amount, this.props.userID);
                                }}
                            >
                                <Text style={styles.text}>move to grocery</Text>
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
                            placeholder = "100 ounces flour"
                            labelStyle={styles.text}
                            style={styles.textInput}
                            onChangeText={
                                ingredient => {
                                    this.setState({
                                        newIngredient: ingredient
                                    });
                                }
                            }
                            value={this.state.newIngredient}
                        />
                        <RkButton
                            style={{backgroundColor: '#ffc100', width:140, alignSelf:'center'}}
                            contentStyle={{color: 'white'}}
                            onPress={
                                () => {
                                    this.addItem();
                                }
                            }
                        >
                            Add Item
                        </RkButton>
                    </DialogContent>
                </Dialog>
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
    fontSize: 13,
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
)(Pantry);
