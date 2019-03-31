import React from 'react';
import {
  BUTTON_BACKGROUND_COLOR,
  BACKGROUND_COLOR,
  ACTION_BUTTON_COLOR
} from '../common/SousChefColors';
import { DEFAULT_FONT } from '../common/SousChefTheme';
import { StyleSheet, Text, View, Button, TouchableOpacity, TextInput, Dimensions, ScrollView,  SafeAreaView,
  StatusBar,} from 'react-native';
import firebase from 'react-native-firebase';
import { SwipeListView } from 'react-native-swipe-list-view';
import { connect } from 'react-redux';
import { saveIsRecent } from '../redux/actions/FavoritedAction';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import LinearGradient from 'react-native-linear-gradient';
import { Icon } from 'react-native-elements';
const recipesRef = firebase.firestore().collection('test_recipes');
const pantryRef = firebase.firestore().collection('pantrylists');
const glRef = firebase.firestore().collection('grocerylists');

class PreviewRecipe extends React.Component {
  static navigationOptions = {
    title: "Preview Recipe",
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
    this.state = {
      recipeID: this.props.navigation.getParam("recipeID"),
      recipe: null,
      image: "",
      imageWidth: 0,
      imageHeight: 0,
      haveIngredients: [],
      dontHaveIngredients: [],
      unitsByIngrName: {},
      addToGlIsClicked: {},
      addAllToGlDisabled: false,
      index: 0,
    };
    this.FirstRoute = this.FirstRoute.bind(this);
    this.SecondRoute = this.SecondRoute.bind(this);
  }

  componentWillMount() {
    recipesRef.doc(this.state.recipeID).get().then((doc) => {
      var data = doc.data();
      var ingredientsArray = [];
      for (var key in data.ingredients) {
        var val = data.ingredients[key];
        val.ingredient = key;
        val.key = key;
        // Initialize value of clicked map
        var copyAddToGL = {...this.state.addToGlIsClicked};
        copyAddToGL[key] = false;
        this.setState({
          addToGlIsClicked: copyAddToGL
        });
        ingredientsArray.push(val);
      }
      data.ingredients = ingredientsArray;
      this.setState({
        recipe: data,
        image: data.images
      });
      this.calculateHaveIngredients();
    })
    .catch((error) => {
      console.warn("Error getting documents for recipe" +
      this.state.recipeID + "\n" +
      error
    );
  });
  this.props.saveIsRecent(this.props.userID, this.props.navigation.getParam("recipeID"))
}

updatePantryAmount = (have, item, surplus) => {
  if (have) {
    var docExists = false;
    // Increment amount in pantry to how much this recipe needs
    firebase.firestore().runTransaction((transaction) => {
      var pantryDocRef = pantryRef.doc(this.props.userID)
      .collection("ingredients").doc(item.ingredient);
      return transaction.get(pantryDocRef).then((doc) => {
        if (!doc.exists) {
          throw "Document does not exist";
        }
        // We have more of this ingredient, update
        docExists = true;
        var data = doc.data();
        transaction.update(pantryDocRef, {
          amount: data.amount - surplus
        });
      });
    }).catch((err) => {
      // We need to add this item to the pantry
      pantryRef.doc(this.props.userID).collection("ingredients")
      .doc(item.ingredient).set({
        amount: -surplus
      });
    });
  }
  else {
    // We want to make sure this item is removed from the pantry
    pantryRef.doc(this.props.userID).collection("ingredients")
    .doc(item.ingredient).delete().then(() => {
      console.log(item.ingredient + " deleted successfully");
    }).catch((error) => {
      console.log(item.ingredient + " already deleted");
    });
  }
}

indicateHave = (arrayIndex, have=true) => {
  var haveCopy = [...this.state.haveIngredients];
  var dontHaveCopy = [...this.state.dontHaveIngredients];

  var element, item, surplus;
  // Move ingredient to appropriate array in state
  if (have) {
    element = dontHaveCopy[arrayIndex];
    item = element[0];
    surplus = element[1];
    dontHaveCopy.splice(arrayIndex, 1);
    haveCopy.push(element);
  }
  else {
    element = haveCopy[arrayIndex];
    item = element[0];
    surplus = element[1];
    haveCopy.splice(arrayIndex, 1);
    dontHaveCopy.push(element);
  }

  this.setState({
    haveIngredients: haveCopy,
    dontHaveIngredients: dontHaveCopy
  });
  this.render();

  // Update ingredient in pantry
  this.updatePantryAmount(have, item, surplus);
}

addIngrToGroceryList = (dontHaveIndex) => {
  var item, surplus;
  item = this.state.dontHaveIngredients[dontHaveIndex][0];
  surplus = this.state.dontHaveIngredients[dontHaveIndex][1];
  var docExists = false;
  // Increment amount in GL to how much this recipe needs
  firebase.firestore().runTransaction((transaction) => {
    var glDocRef = glRef.doc(this.props.userID)
    .collection("ingredients").doc(item.ingredient);
    return transaction.get(glDocRef).then((doc) => {
      if (!doc.exists) {
        throw "Ingredient not in GL";
      }
      // We have more of this ingredient, update
      docExists = true;
      var data = doc.data();
      transaction.update(glDocRef, {
        amount: data.amount - surplus
      });
    });
  }).catch((err) => {
    // We need to add this item to the pantry
    glRef.doc(this.props.userID).collection("ingredients")
    .doc(item.ingredient).set({
      amount: -surplus
    });
  }).then(() => {
    var copyAddToGL = {...this.state.addToGlIsClicked};
    copyAddToGL[item.ingredient] = true;
    this.setState({
      addToGlIsClicked: copyAddToGL
    });

    this.render();
  });
}

addAllToGroceryList = () => {
  this.setState({
    addAllToGlDisabled: true
  });
  this.state.dontHaveIngredients.forEach((item, index) => {
    if (!this.state.addToGlIsClicked[item[0].ingredient]) {
      // Only add if it hasn't been added already
      this.addIngrToGroceryList(index);
    }
  });
}

calculateHaveIngredients = () => {
  if (this.state.recipe.ingredients == null){
    console.warn("null");
  }

  // Sort ingredients into have and don't have
  var promises = [];
  for (var i = 0; i < this.state.recipe.ingredients.length; i++) {
    // Search for item in pantry
    promises.push(pantryRef.doc(this.props.userID).collection("ingredients")
    .doc(this.state.recipe.ingredients[i].ingredient).get());
  }

  // Deal with concurrency issues by "joining" at steps
  Promise.all(promises).then((docs) => {
    var surpluses = new Array(docs.length);
    surpluses = surpluses.map((x) => { return null; });
    for (var i = 0; i < docs.length; i++) {
      var pantryIngrDoc = docs[i];
      if (!pantryIngrDoc.exists) {
        continue;
      }
      var pantryIngrData = pantryIngrDoc.data();
      surpluses[i] = pantryIngrData.amount -
      this.state.recipe.ingredients[i].standardQuantity;

      var unitMapCopy = {...this.state.unitsByIngrName};
      unitMapCopy[pantryIngrData.id] = pantryIngrData.unit;
      this.setState({
        unitsByIngrName: unitMapCopy
      });
    }
    return surpluses;
  }).then((surpluses) => {
    for (var i = 0; i < surpluses.length; i++) {
      // Handle case when we don't have this ingredient at all
      if (surpluses[i] == null) {
        surpluses[i] = -this.state.recipe.ingredients[i].standardQuantity;
      }
    }
    return surpluses;
  }).then((surpluses) => {
    var haveIngredients = [];
    var dontHaveIngredients = [];
    for (var i = 0; i < surpluses.length; i++) {
      var surplus = surpluses[i];
      var arr = [this.state.recipe.ingredients[i], surplus];
      if (surplus >= 0) {
        // We have enough of ingredient at index i
        haveIngredients.push(arr);
      }
      else {
        // We don't have enough of ingredient at index i
        dontHaveIngredients.push(arr);
      }
    }
    this.setState({
      haveIngredients: haveIngredients,
      dontHaveIngredients: dontHaveIngredients
    });
    this.forceUpdate();
  });
}

cookNow = () => {
  this.props.navigation.navigate('CookNow', {
    recipe: this.state.recipe,
    ingredientsToRemove: this.state.haveIngredients,
  });
}

changeServings = (text) => {
  if (text.match(/\./i) || text == "") return;
  var numServings = parseInt(text);
  if (numServings == 0 || numServings == NaN) return;
  var scaleBy = numServings / this.state.recipe.servings;

  // Change quantities in recipe
  var recipeCopy = {...this.state.recipe};
  var ingredientsCopy = [...recipeCopy.ingredients];
  for (var i = 0; i < ingredientsCopy.length; i++) {
    ingredientsCopy[i].standardQuantity = Math.round(
      ingredientsCopy[i].standardQuantity * scaleBy * 100) / 100;
      ingredientsCopy[i].originalQuantity = Math.round(
        ingredientsCopy[i].originalQuantity * scaleBy * 100) / 100;
      }

      recipeCopy.servings = numServings;
      recipeCopy.ingredients = ingredientsCopy;
      this.setState({
        recipe: recipeCopy,
        haveIngredients: [],
        dontHaveIngredients: []
      });

      this.calculateHaveIngredients();
    }

    closeRow(rowMap, rowKey) {
      if (rowMap[rowKey]) {
        rowMap[rowKey].closeRow();
      }
    }

    FirstRoute(){
      return (
        <ScrollView style={{flex:1, marginBottom: 0,}}>
          <SwipeListView
            useFlatList
            data={this.state.dontHaveIngredients}
            keyExtractor={(item, index) => item[0].key}
            extraData={this.state}
            style={[styles.list, {height: 50 * this.state.dontHaveIngredients.length}]}
            renderItem={({item, index}) =>
            <View key={item.key} style={[styles.listItem]}>
              <Text
                style={[styles.ingredientName]}
                key={"Ingredient Name " + index}
                data={{surplus: item[1]}}>
                {item[0].originalQuantity} {item[0].originalText}
              </Text>
              <Text
                style={[styles.ingredientSubtext]}
                key={"Ingredient subtext " + index}>
                {
                  (Math.round(item[0].standardQuantity*100) / 100) +
                  " " + item[0].standardUnit + " " + item[0].ingredient
                }
              </Text>
            </View>
          }
          renderHiddenItem={ (data, rowMap) => (
            <View style={styles.rowBack}>
              <TouchableOpacity
                style={[styles.backRightBtn, styles.backRightBtnRight,
                  {
                    backgroundColor: this.state.addToGlIsClicked[data.item[0].ingredient] ? "gray" : {BUTTON_BACKGROUND_COLOR}
                  }]}
                  onPress={ _ => {
                    this.addIngrToGroceryList(data.index);
                  }}>
                  <Text style={styles.text}>{
                      this.state.addToGlIsClicked[data.item[0].ingredient] ?
                      "Added to\nGL" : "Add to\nGL"
                    }</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.backRightBtn, styles.backLeftBtnRight]}
                    onPress={ _ => {
                      this.indicateHave(data.index);
                    }}>
                    <Text style={styles.text}>
                      Have
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              leftOpenValue={150}
              />
          </ScrollView>
        );}

        SecondRoute(){
          return (
            <ScrollView style={{flex:1, marginBottom: 0,}} >
              <SwipeListView
                useFlatList
                data={this.state.haveIngredients}
                keyExtractor={(item, index) => item[0].key}
                extraData={this.state}
                style={[styles.list]}
                renderItem={({item, index}) =>
                <View key={item.key} style={[styles.listItem]}>
                  <Text
                    style={[styles.ingredientName]}
                    key={"Ingredient Name " + index}
                    data={{surplus: item[1]}}>
                    {item[0].originalQuantity} {item[0].originalText}
                  </Text>
                  <Text
                    style={[styles.ingredientSubtext]}
                    key={"Ingredient subtext " + index}>
                    {
                      (Math.round(item[0].standardQuantity*100) / 100) +
                      " " + item[0].standardUnit + " " + item[0].ingredient
                    }
                  </Text>
                </View>
              }
              renderHiddenItem={ (data, rowMap) => (
                <View style={styles.rowBack}>
                  <TouchableOpacity
                    style={[styles.backRightBtn, styles.backRightBtnRight]}
                    onPress={ _ => {
                      this.indicateHave(data.index, false);
                    }}>
                    <Text style={styles.text}>
                      {"Don't\nHave"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              leftOpenValue={75}
              />
          </ScrollView>
        );}
        render() {
          if (this.state.recipe && this.state.recipe.ingredients) {
            return (
              <View style={[styles.container]}>
                <Text style={[styles.title]}>
                  {this.state.recipe.title ? this.state.recipe.title : "<Recipe Name>"}
                </Text>
                <View style={styles.servings}>
                  <Icon
                    name='restaurant'
                    color='#17ba6b' />
                  <Text style={{color:BUTTON_BACKGROUND_COLOR, fontFamily:DEFAULT_FONT, marginRight: 20, marginLeft: 20, fontSize:18,width:60}}>
                      Serves:
                    </Text>
                    <TextInput
                      style={{width:60, fontSize: 14, borderBottomColor: 'gray', borderBottomWidth: 0.5, paddingLeft:20,}}
                      keyboardType={"number-pad"}
                      maxLength={3}
                      enablesReturnKeyAutomatically={true}
                      onChangeText={(text) => this.changeServings(text)}
                      defaultValue={this.state.recipe.servings.toString()}
                      />

                </View>
                <TabView
                  style={{flex: 1,}}
                  navigationState={{
                    index: this.state.index,
                    routes: [
                      {key: 'first',
                        title: 'You Have',
                      },
                      {key: 'second',
                        title: 'You Don\'t Have',

                      },
                    ],
                  }}
                  renderScene={({ route, jumpTo }) => {
                    switch (route.key) {
                      case 'first':
                      return this.FirstRoute();
                      case 'second':
                      return  this.SecondRoute();
                    }
                  }}
                  renderTabBar={props =>
                    <TabBar
                      {...props}
                      indicatorStyle={{ backgroundColor: BUTTON_BACKGROUND_COLOR }}
                      style={{ backgroundColor: 'white', color: BUTTON_BACKGROUND_COLOR, }}
                      activeColor = {{color: BUTTON_BACKGROUND_COLOR, textColor:BUTTON_BACKGROUND_COLOR, }}
                      inactiveColor = {{}}
                      labelStyle = {{color: BUTTON_BACKGROUND_COLOR, fontWeight: 'bold', fontFamily: 'Avenir'}}
                      />
                  }
                  onIndexChange={index => this.setState({ index })}
                  initialLayout={{ width: Dimensions.get('window').width }}
                  />

                  <LinearGradient colors={['#17ba6b','#1d945b']} locations={[0.3,1]} style = {styles.button}>
                    <TouchableOpacity
                      disabled={this.state.addAllToGlDisabled}
                      onPress={() => this.addAllToGroceryList()}
                      >
                      <Text style = {styles.buttonText} onPress={this.finishCooking}>
                        Add All to Grocery List
                      </Text>
                    </TouchableOpacity>
                  </LinearGradient>

                  <LinearGradient colors={['#17ba6b','#1d945b']} locations={[0.3,1]} style = {styles.button}>
                    <TouchableOpacity
                      onPress={() => this.cookNow()}
                      >
                      <Text style = {styles.buttonText} onPress={this.finishCooking}>
                        Make right now
                      </Text>
                    </TouchableOpacity>
                  </LinearGradient>
              </View>
            );
          }
          else {
            return null;
          }
        }
      }

      const styles = StyleSheet.create({
        container: {
          flex: 1,
          flexDirection: "column",
          paddingBottom: 10
        },
        title: {
          fontSize: 30,
          fontFamily: DEFAULT_FONT,
          margin: 5,
          fontWeight: 'bold',
          color: BUTTON_BACKGROUND_COLOR,
          alignSelf:'center'

        },
        servings: {
          width: Dimensions.get('window').width/3,
          height: 60,
          padding:15,
          alignItems: 'center',
          flexDirection: 'row',
        //  justifyContent:'center',
        },
        ingredientName: {
          fontSize: 16,
          fontFamily: DEFAULT_FONT,
          paddingLeft:10,
        },
        ingredientSubtext: {
          fontSize: 11,
          fontFamily: DEFAULT_FONT,
          paddingLeft:10,
          color: BUTTON_BACKGROUND_COLOR,
        },
        list: {
          flex: 1,
          flexDirection: "column",
          width: "100%"
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
          fontSize: 15,
          color: BACKGROUND_COLOR,
          padding: 4
        },
        backRightBtn: {
          alignItems: 'center',
          bottom: 0,
          justifyContent: 'center',
          position: 'absolute',
          top: 0,
          width: 75
        },
        rowBack: {
          alignItems: 'center',
          backgroundColor: '#DDD',
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingLeft: 15,
        },
        backRightBtnRight: {
          backgroundColor: '#ffc100',
          left: 0
        },
        backLeftBtnRight: {
          backgroundColor: 'green',
          left: 75
        },
        buttonText: {
          fontSize: 16,
          fontFamily: DEFAULT_FONT,
          textAlign: 'center',
          color: 'white',
          backgroundColor:'transparent',
          fontWeight: 'bold',
        },
        button: {
          alignSelf:'center',
          alignItems: 'center',
          backgroundColor: 'white',
          padding: 10,
          width: 250,
          borderRadius:30,
          margin: 10,
        },
      });


      const mapStateToProps = state => {
        return {
          userID: state.userInfo.userID,
        }
      }

      const mapDispatchToProps = dispatch => {
        return {
          saveIsRecent: (userID, recipeID) => {
            saveIsRecent(userID, recipeID)
          },
        }
      }
export default connect(mapStateToProps, mapDispatchToProps)(PreviewRecipe);
