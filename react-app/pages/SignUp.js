import { BACKGROUND_COLOR, BUTTON_BACKGROUND_COLOR, DARK_GREEN_BACKGROUND } from './../common/SousChefColors'
import React, { Component } from 'react';
import { StyleSheet, Image, Text, View, ScrollView, Dimensions, TouchableOpacity, SafeAreaView, StatusBar,} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { RkButton } from 'react-native-ui-kitten';
import { createUser } from './../redux/actions/AuthenticationAction';
import { connect } from 'react-redux';
import SousChefTextInput from './../components/SousChefTextInput'

export class SignUp extends Component {
  static navigationOptions = {
    headerTransparent:false,
    headerBackground:(
      <LinearGradient colors={['#17ba6b','#1d945b']} locations={[0.3,1]} style={{height:90}}>
        <SafeAreaView style={{flex:1 }}>
          <StatusBar barStyle="light-content"/>
        </SafeAreaView>
      </LinearGradient>
    ),

  }

    constructor(props) {
        super(props);
        this.state = {
            email: '',
            password: '',
        };
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.userID) {
            this.props.navigation.navigate('PrepopulatePantry');
        }
    }

    handleSignUp = () => {
        this.props.signUp(this.state.email, this.state.password);
    }

    render() {
        return (
          <View style={styles.container}>
              <LinearGradient colors={['#1d945b', '#17ba6b', '#ffc100',]} style={styles.linearGradient} locations={[0.4,0.65,1]}>
              <Image source={require('../assets/sousChefWhite.png')} style={[styles.logo]} resizeMode="contain"/>
                <SousChefTextInput
                    placeholder='example@email.com'
                    label={'Email:'}
                    onChangeText={email => this.setState({ email })}
                    value={this.state.email}
                />
                <SousChefTextInput
                    placeholder='examplePassword'
                    label={'Password:'}
                    onChangeText={password => this.setState({ password })}
                    value={this.state.password}
                />
              <TouchableOpacity style = {styles.button}
                    onPress={this.handleSignUp}
                ><Text style ={styles.buttonText}>SIGN UP</Text></TouchableOpacity>
                <Text style={styles.errorMessage}>{this.props.errorMessage}</Text>
                </LinearGradient>
          </View>
        );
    }
}

const styles = StyleSheet.create({
    scrollContainer: {
        backgroundColor: BACKGROUND_COLOR
    },
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    linearGradient: {
      flex: 1,
      alignItems: 'center',
    },
    logo: {
        marginTop: Dimensions.get('window').height/5,
        height: 60,
        width: 160,
    },
    emailPasswordContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        backgroundColor: BACKGROUND_COLOR,
    },
    errorMessage: {
        color: 'white',
        borderTopWidth: 20,
        borderLeftWidth: 20,
        borderRightWidth: 20,
        flexWrap: 'wrap',
    },
    buttonText: {
      fontSize: 16,
      fontFamily: 'Avenir',
      textAlign: 'center',
      color: BUTTON_BACKGROUND_COLOR,
      backgroundColor:'transparent',
      fontWeight: 'bold',
    },
    button: {
      alignItems: 'center',
      backgroundColor: 'white',
      padding: 10,
      width: 250,
      borderRadius:30,
      margin: 10,
    },
});

const mapStateToProps = (state) => {
    return {
        userID: state.userInfo.userID,
        errorMessage: state.userInfo.errorMessage
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        signUp: (email, password) => {
            dispatch(createUser(email, password))
        }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(SignUp)
