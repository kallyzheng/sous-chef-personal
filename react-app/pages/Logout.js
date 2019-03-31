import { BACKGROUND_COLOR } from '../common/SousChefColors'
import React, { Component } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { StyleSheet, Image, Text, View, ScrollView } from 'react-native';
import { logoutUser } from './../redux/actions/AuthenticationAction';
import { connect } from 'react-redux';

export class Logout extends Component {

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.props.logout()
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.userID == "") {
            this.props.navigation.navigate('Welcome');
        }
    }

    render() {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#1d945b', '#17ba6b', '#ffc100',]} style={styles.linearGradient} locations={[0.4,0.65,1]}>
                    <Image source={require('../assets/sousChefWhite.png')} style={[styles.logo]} resizeMode="contain" />
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
        alignItems: 'center',
        backgroundColor: BACKGROUND_COLOR,
    },
    logo: {
        height: 120,
        marginBottom: 16,
        marginTop: 64,
        padding: 10,
        width: 135,
    },
});

const mapStateToProps = (state) => {
    return {
        userID: state.userInfo.userID
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        logout: () => {
            dispatch(logoutUser())
        }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Logout)
