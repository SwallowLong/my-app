import React from 'react'
import { render } from '@testing-library/react'
import App from './../App'
export default class Helloworld extends React.Component{

    render(){

        return(
            <App>
               <h1>Hello world</h1> 
            </App>
        )
    }
}