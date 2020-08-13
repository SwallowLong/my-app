import React, {Component} from 'react';
import { Tabs, Button, Icon, message, Card, Checkbox, Row, Col, Spin, TreeSelect } from 'antd';
import * as R from 'ramda';
import CommonFn from 'constant/CommonFn.js'
import classNames from 'classnames'
import styles from '../PermissionSetting/permissionSetting.module.css'
//gql
import {graphql, compose} from 'react-apollo';
import {createOrUpdatePermission} from 'query/PermissionGql/PermissionGql'
import { seniorSettingRole } from 'query/RoleGql/RoleGql.js';
import { permissionResource } from 'query/TypeGql/TypeGql';

const TabPane = Tabs.TabPane;
const CheckboxGroup = Checkbox.Group;
const TreeNode = TreeSelect.TreeNode;

class SeniorSetting extends Component {
  static defaultProps = {
    roleType: {},
    roles: []
  }
  state = {
    activeKey: 0,
    checkValue: undefined,
    spinning: false,
    permissionResourceData: [], // 存放权限数据
    roleId: null
  };

  componentWillReceiveProps(nextProps) {
    // 关联card Tower 任务: #bug# web-角色配置的高级配置搜不到打样 ( https://tower.im/teams/409767/todos/118991 )
    if (this.state.permissionResourceData.length === 0 && R.path(['permissionResource', '__type', 'enumValues'], nextProps)) {
      this.setState({
        permissionResourceData: R.pathOr([], ['permissionResource', '__type', 'enumValues'], nextProps).filter(item => !['StrikeOffItem', 'Sample'].includes(item.name))
      })
    }
  }

  onChange = ({checkedList, checkAll, permissionsIndex, permits = [], allPermissions, type}) => {
    let permissionResource = R.clone(allPermissions);
    if(type === 'checkedList') {
      // 单独选择
      permissionResource[permissionsIndex] && ( permissionResource[permissionsIndex].permissionsValues = checkedList );
    } else if(type === 'checkAll' && checkAll) {
      // 全选
      permissionResource[permissionsIndex] && ( permissionResource[permissionsIndex].permissionsValues = R.pluck(['value'], permits) );
    } else if(type === 'checkAll' && !checkAll) {
      // 反选
      permissionResource[permissionsIndex] && ( permissionResource[permissionsIndex].permissionsValues = [] );
    }
    this.setState({
      allPermissions: permissionResource,
      editPermission: true,
      checkValue: '', // 取消默认选中样式
    });
  };

  scrollToAnchor = (anchorName) => {
    if (anchorName) {
      this.setState({
        checkValue: anchorName
      })
      let anchorElement = document.getElementById(anchorName);
      if(anchorElement) { 
        anchorElement.scrollIntoView({ inline: 'center', block: 'center', behavior: 'smooth'})
      }
    }
  }

  submit = async ({id}) => {
    const state = this.state
    const props = this.props
    const refetch = R.path(['roles', 'refetch'])(props);
    let permissionResource = R.clone(state.allPermissions);
    const permissionResourceEdit = R.filter(item =>item.permissionsValues, permissionResource)
    try {
      await permissionResourceEdit.map(async item =>{
        const permits = R.pluck('value', R.clone(item.permits || [])) 
        const permissionsValues = R.clone(item.permissionsValues)
        const trueValues = R.intersection(permits, permissionsValues)  // 选中的 values
        const falseValues = R.difference(permits, permissionsValues)  // 没选中的 values
        let permitsValues = []
        trueValues.forEach(trueValueItem => {
          permitsValues.push({
            name: trueValueItem,
            value: true
          })
        })

        falseValues.forEach(falseValueItem => {
          permitsValues.push({
            name: falseValueItem,
            value: false
          })
        })
        try {
          await this.props.createOrUpdatePermission({
            variables: {
              input: {
                roleId: id,
                resource: item.resource,
                permits: permitsValues
              }
            },
            update: () =>{
              refetch && refetch()
            }
          })
        } catch (err) {
          CommonFn.getErrorMessage(err)
          refetch && refetch()
          this.setState({
            editPermission: false
          })
        }
      })
      
      message.success('更新成功！')
      setTimeout(() => {
        this.setState({
          editPermission: false
        })
      }, 3000);
    } catch (err) {
      CommonFn.getErrorMessage(err)
      this.setState({
        editPermission: false
      })
    }
  }

  onChangeTabs = async (value) => {
    let roleId = this.props.roles[value].id
    this.setState({activeKey: value, editPermission: false, spinning: true, roleId: roleId})
    try {
      let res = await this.props.role.refetch({
        id: roleId
      })
      if (R.path(['data', 'role', 'id'], res)) {
        this.setState({
          spinning: false
        })
      }
    } catch {
      // do something
    }
  }

  getAllPermissions = () => {
    const state = this.state;
    const props = this.props
    let allPermissions = R.pathOr([], ['role', 'role', 'allPermissions'], props)
    return allPermissions.length > 0 ? allPermissions.map((permissionsItem, permissionsIndex) => {
      let permissionsValues = []
      if(!permissionsItem.permissionsValues) {
        let permissions = R.filter(i => i.resource === permissionsItem.resource, R.pathOr([],['role', 'role', 'permissions'], props))
        permissions = R.pathOr([], [0, 'permits'], permissions)
        const permissionsValuesArray = R.filter(i => i.nameValue, permissions)
        permissionsValues = R.pluck('value', permissionsValuesArray)
      }
      return (
        <section style={{height: 'auto', display: 'flex', borderBottom: '1px solid #eee'}} key={permissionsIndex} className={classNames({[styles.hover]:  state.checkValue === (R.path(['resource'], permissionsItem))})} >
            <Checkbox
              indeterminate={this.state.indeterminate}
              style={{width: '140px', margin: '0', lineHeight: '72px'}}
              onChange={e => this.onChange({
                checkAll: e.target.checked,
                permissionsIndex,
                allPermissions: state.editPermission ? R.pathOr([],['allPermissions'],state) : allPermissions,
                permits: R.pathOr([], ['permits'], permissionsItem),
                type: 'checkAll',
              })}
              checked={R.path(['length'], R.project(['label', 'value'], permissionsItem.permits)) === (R.path(['permissionsValues', 'length'], permissionsItem) || R.path(['length'], permissionsValues))}
            >
            <span id={R.path(['resource'], permissionsItem)} >{R.path(['description'], permissionsItem)}</span>
            </Checkbox>
            <CheckboxGroup 
              style={{lineHeight: '72px', width: 'calc(100% - 140px)'}} 
              onChange={(checkedList) => this.onChange({
                checkedList,
                roleId: item.id,
                resource: R.path(['resource'], permissionsItem),
                permissionsIndex,
                allPermissions: state.editPermission ? R.pathOr([],['allPermissions'],state) : R.pathOr([],['allPermissions'],item),
                type: 'checkedList',
              })} 
              options={R.project(['label', 'value'], permissionsItem.permits)} 
              value={permissionsItem.permissionsValues || permissionsValues}
            />
        </section>
      )
    }) : null
  }
 
  render() {
    const state = this.state;
    const props = this.props;
    const roleType = props.roleType;
    return (
      <Row gutter={16}>
        <Col span={24}>
          <Card title={<span><Icon type="windows-o"/>高级配置</span>} extra={<TreeSelect
          style={{ width: 300 }}
          dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
          placeholder="快速搜索"
          value={this.state.checkValue}
          treeDefaultExpandAll
          onChange={this.scrollToAnchor}
          showSearch
          treeNodeFilterProp={'title'}
        >
          {
            this.state.permissionResourceData.map(item => {
              return <TreeNode value={item.name} title={item.description} key={item.name} />
            })
          }
        </TreeSelect>}>
          <Tabs
            defaultActiveKey="0"
            style={{marginTop: '-20px'}}
            onChange={this.onChangeTabs}
          >
            {
              props.roles.map((item, index) => (
                <TabPane tab={roleType[item.name] || item.name} key={index}></TabPane>
              ))
            }
          </Tabs>
          <Spin spinning={this.state.spinning}>
            {this.getAllPermissions()}
            <Button 
              style={{marginTop: '20px'}} 
              type="primary" 
              onClick={() => {this.submit({id: this.state.roleId})}}
            >
            <Icon type="cloud-upload-o"/> 同步配置
            </Button> 
          </Spin>
          </Card>
        </Col>
      </Row>
    );
  }
}

export default compose(
  graphql(seniorSettingRole, {
    name: 'role',
    options: (props) => ({
      fetchPolicy: 'network-only',
      variables: {
        id: R.path(['roles', '0', 'id'], props)
      },
    })
  }),
  createOrUpdatePermission,
  permissionResource
)(SeniorSetting)