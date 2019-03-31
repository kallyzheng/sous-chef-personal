import { RkTextInput } from 'react-native-ui-kitten';
import { StyleSheet } from 'react-native';
import React, {Component} from 'react';


export default class SousChefTextInput extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        return (
            <RkTextInput
                    rkType="clear"
                    label={this.props.label}
                    placeholder={this.props.placeholder}
                    labelStyle={styles.text}
                    style={styles.textInput}
                    autoCapitalize="none"
                    onChangeText={this.props.onChangeText}
                    value={this.props.value}
                    inputStyle={{
                      color: 'white',
                    }}

            />
        )
    }
}

const styles = StyleSheet.create({
    text: {
        fontSize: 15,
        color: 'white',
    },
    textInput: {
        borderLeftWidth: 50,
        borderRightWidth: 50,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: "white",
        borderBottomWidth: 1,

        color: 'red',
    },

});
