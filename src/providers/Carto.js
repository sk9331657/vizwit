import React from 'react'
import squel from 'squel'

export default class Carto extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      totalRows: [],
      filteredRows: []
    }
  }

  render () {
    const ChartType = this.props.ChartType
    return <ChartType
            totalRows={this.state.totalRows}
            filteredRows={this.state.filteredRows} />
  }

  async componentDidMount () {
    const url = constructUrl(this.props.config, this.props.filters)
    const response = await fetch(url)
    const data = await response.json()
    this.setState({ totalRows: data.rows })
  }

  async componentWillReceiveProps (nextProps) {
    if (this.props.filters !== nextProps.filters) { // do I need deep comparison?
      const url = constructUrl(this.props.config, nextProps.filters)
      const response = await fetch(url)
      const data = await response.json()
      this.setState({ filteredRows: data.rows })
    }
  }
}

// Separated from class just to ensure it's pure and stateless
function constructUrl (config, filters) {
  const query = squel.select().from(config.dataset)
  const baseFilters = config.baseFilters || []
  const combinedFilters = baseFilters.concat(filters)

  if (config.valueField || config.aggregateFunction || config.groupBy) {
    if (config.valueField) {
      // If valueField specified, use it as the value
      query.field(`${config.valueField} as value`)
    } else {
      // Otherwise use the aggregateFunction / aggregateField as the value
      const aggregateFunction = config.aggregateFunction || 'count'
      const aggregateField = config.aggregateField || '*'
      query.field(`${aggregateFunction}(${aggregateField}) as value`)
    }

    if (config.groupBy) {
      query.field(`${config.groupBy} as label`)
        .group(config.groupBy)

      // Order by (only if there will be multiple results)
      if (config.order) {
        query.order(config.order, '')
      } else {
        query.order('value', false)
      }
    }
  } else {
    // No aggregation specified
    if (config.offset) query.offset(config.offset)

    const order = config.order || 'cartodb_id'
    query.order(order, '')
  }

  // Where
  if (combinedFilters.length > 0) {
    const where = combinedFilters.map((filter) => {
      return parseExpression(filter.field, filter.expression)
    })
    query.where(where.join(' and '))
  }

  const sql = query.toString()
  return `https://${config.domain}/api/v2/sql?q=${sql}`
}

function parseExpression (field, expression) { // todo: move to shared module
  if (expression.type === 'and' || expression.type === 'or') {
    return [
      parseExpression(field, expression.value[0]),
      expression.type,
      parseExpression(field, expression.value[1])
    ].join(' ')
  } else if (expression.type === 'in' || expression.type === 'not in') {
    return [
      field,
      expression.type,
      '(' + expression.value.map(enclose).join(', ') + ')'
    ].join(' ')
  } else {
    return [
      field,
      expression.type,
      enclose(expression.value)
    ].join(' ')
  }
}

function enclose (val) {
  if (typeof val === 'string' && val != 'true' && val != 'false') { // eslint-disable-line
    return "'" + val + "'"
  } else if (val === null) {
    return 'null'
  } else {
    return val
  }
}
