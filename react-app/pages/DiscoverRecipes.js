import React from 'react';
import { BACKGROUND_COLOR } from '../common/SousChefColors'
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { DEFAULT_FONT } from '../common/SousChefTheme'
import SousChefCard from '../components/SousChefCard';
import {
    beginReadyToGoFetch,
    beginRecentRecipesFetch,
    beginRecommendedRecipesFetch,
} from '../redux/actions/RecipeAction';
import { connect } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';

class DiscoverRecipes extends React.Component {
    static navigationOptions = {
        title: "Discover",
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
        drawerLabel: 'Discover'
    }
    constructor(props) {
        super(props);
        this.state = {};
    }

    drawerOpen = () => {this.props.navigation.openDrawer();}

    componentWillMount() {
        this.props.beginReadyToGoFetch(this.props.userID);
        this.props.beginRecentRecipesFetch(this.props.userID);
        this.props.beginRecommendedRecipesFetch(this.props.userID);
    }

    render() {
        return (
            <View style={[styles.container]}>
                <View style={[styles.sectionContainer]}>
                    <Text style={[styles.sectionHeader]}>Ready To Go</Text>
                    <FlatList
                        style={[styles.section]}
                        keyExtractor={(item, index) => index.toString()}
                        horizontal= {true}
                        data={this.props.readyToGo}
                        renderItem={({item}) => {
                            return (
                                <TouchableOpacity onPress={() => {
                                    this.props.navigation.navigate("PreviewRecipe", {recipeID: item.id});
                                }}>
                                    <SousChefCard
                                        headerText={item.title}
                                        bodyText={
                                            "Time: " +
                                            (item.timeHour == "0" ? "" : item.timeHour + "h") +
                                            (item.timeMinute == "0" ? "" : item.timeMinute + "m") +
                                            "\n" +
                                            "Serving Size: " +
                                            item.servings
                                        }
                                        imagePath={item.images}
                                    />
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
                <View style={[styles.sectionContainer]}>
                    <Text style={[styles.sectionHeader]}>Recent</Text>
                    <FlatList
                        style={[styles.section]}
                        horizontal= {true}
                        keyExtractor={(item, index) => index.toString()}
                        data={this.props.recent}
                        renderItem={({item}) => {
                            return (
                                <TouchableOpacity onPress={() => {
                                    this.props.navigation.navigate("PreviewRecipe", {recipeID: item.id});
                                }}>
                                    <SousChefCard
                                        headerText={item.title}
                                        bodyText={
                                            "Time: " +
                                            (item.timeHour == "0" ? "" : item.timeHour + "h") +
                                            (item.timeMinute == "0" ? "" : item.timeMinute + "m") +
                                            "\n" +
                                            "Serving Size: " +
                                            item.servings
                                        }
                                        imagePath={item.images}
                                    />
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
                <View style={[styles.sectionContainer]}>
                    <Text style={[styles.sectionHeader]}>Recommended</Text>
                    <FlatList
                        style={[styles.section]}
                        horizontal= {true}
                        keyExtractor={(item, index) => index.toString()}
                        data={this.props.recommended}
                        renderItem={({item}) => {
                            return (
                                <TouchableOpacity onPress={() => {
                                    this.props.navigation.navigate("PreviewRecipe", {recipeID: item.id});
                                }}>
                                    <SousChefCard
                                        headerText={item.title}
                                        bodyText={
                                            "Time: " +
                                            (item.timeHour == "0" ? "" : item.timeHour + "h") +
                                            (item.timeMinute == "0" ? "" : item.timeMinute + "m") +
                                            "\n" +
                                            "Serving Size: " +
                                            item.servings
                                        }
                                        imagePath={item.images}
                                    />
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "column",
        paddingBottom: 10
    },
    section: {
        flex: 1,
        flexDirection: "row"
    },
    sectionHeader: {
        fontFamily: DEFAULT_FONT,
        fontSize: 18,
        margin: 5,
        fontWeight: 'bold',
    },
    sectionContainer: {
        flex: 1,
        borderBottomColor: BACKGROUND_COLOR,
        borderBottomWidth: 0.5,
        paddingBottom: 5,
    }
})

const mapStateToProps = state => {
    return {
        readyToGo: state.readyToGoRecipes,
        recommended: state.recommendedRecipes,
        recent: state.recentRecipes,
        userID: state.userInfo.userID,
    }
}

export default connect(
    mapStateToProps,
    {
        beginReadyToGoFetch: beginReadyToGoFetch,
        beginRecentRecipesFetch: beginRecentRecipesFetch,
        beginRecommendedRecipesFetch: beginRecommendedRecipesFetch
    }
)(DiscoverRecipes);
