import React, { useCallback, useMemo, useState } from 'react'
import styled from '@emotion/styled'
import { toast } from 'react-toastify'
import matchSorter from 'match-sorter'
import { _, formatDate, SUB, bytesToBandwidthStr, thisMonthPeriodStr } from '@mailmask/utils'
import {
  useTable,
  useSortBy,
  useGlobalFilter,
} from 'react-table'

import { getAppConfig, isSelfHosted } from '../../../appConfig'
import { trackEvent } from '../../../analytics'
import { useSafeMutation, useSafeQuery } from '../../../hooks'
import { GetMyMasksQuery } from '../../../../graphql/queries'
import { UpdateMaskStatusMutation } from '../../../../graphql/mutations'
import QueryResult from '../../QueryResult'
import TextInput from '../../TextInput'
import BandwidthStatsThisMonth from '../../BandwidthStatsThisMonth'
import { DashboardLink } from '../../Link'
import Icon from '../../Icon'
import IconButton from '../../IconButton'
import HintButton from '../../HintButton'

const { DOMAIN } = getAppConfig()

const StyledBandwidthStatsThisMonth = styled(BandwidthStatsThisMonth)`
  margin-bottom: 2rem;
`

const TableContainer = styled.div`
  width: 100%;
  overflow-y: scroll;
`

const Table = styled.table`
  border: none;
`

const HeaderCell = styled.th`
  ${({ theme }) => theme.font('header', 'extraBold')};
  padding: 1rem 2rem 1rem 0;
  text-align: left;
  min-width: 100px;
  white-space: nowrap;
`

const GlobalFilterTextInput = styled(TextInput)`
  font-size: 0.9rem;
  padding: 0.5em;
  margin: 0.3rem 0;
  width: 70%;
  max-width: 400px;
`

const DataRow = styled.tr`
  ${({ theme }) => theme.font('body')};
  font-size: 1.2rem;

  td {
    padding: 0.5rem 0;
  }
`

const ToggleButton = styled(IconButton)`
  border: none;
  color: ${({ isOn, theme }) => (isOn ? theme.dashboardPage.masksTable.maskOnIconColor : theme.dashboardPage.masksTable.maskOffIconColor)};
`

const MaskStatusText = styled.span`
  ${({ theme }) => theme.font('header', 'regular', 'italic')};
  color: ${({ theme }) => theme.dashboardPage.masksTable.maskStatusTextColor};
`

const MaskPrefix = styled.span`
  margin-right: 0.2em;
`

const MaskSuffix = styled.span`
  font-size: 80%;
  color: ${({ theme }) => theme.dashboardPage.masksTable.maskSuffixTextColor};
`

const MetaData = styled.span`
  color: ${({ theme }) => theme.dashboardPage.masksTable.metaDataTextColor};
`

const CellContent = styled.div`
  padding-right: 2rem;
  white-space: nowrap;
`

const UpgradeText = styled.span`
  ${({ theme }) => theme.font('body', 'regular', 'italic')};
  font-size: 70%;
`

const SortArrowIcon = styled(Icon)`
  transform: rotate(${({ rotate }) => `${rotate || 0}deg`});
  margin-left: 0.2em;
`

const UpArrow = () => (
  <SortArrowIcon name='chevron-down' rotate={180} />
)

const DownArrow = () => (
  <SortArrowIcon name='chevron-down' />
)

const HeaderHintButton = styled(HintButton)`
  margin: 0 0 0 0.3em;
  position: relative;
  top: -2px;
`

const HeaderHint = styled.div`
  p {
    margin-bottom: 1em;
    &:last-child {
      margin-bottom: 0;
    }
  }
`

function GlobalFilter ({
  preGlobalFilteredRows,
  globalFilter,
  setGlobalFilter,
}) {
  const count = preGlobalFilteredRows.length

  return (
    <GlobalFilterTextInput
      onChange={setGlobalFilter}
      value={globalFilter || ''}
      placeholder={`Filter ${count} entries...`}
    />
  )
}

function fuzzyTextFilterFn (rows, id, filterValue) {
  return matchSorter(rows, filterValue, { keys: [ row => row.values[id] ] })
}

// Let the table remove the filter if the string is empty
fuzzyTextFilterFn.autoRemove = val => !val



const PremiumCellContent = ({ children, me }) => {
  if (_.get(me, 'sub.plan') !== SUB.PLAN.BASIC) {
    return <CellContent>{children}</CellContent>
  } else {
    return (
      <CellContent>
        <UpgradeText>
          <DashboardLink panel='plan'>upgrade to view</DashboardLink>
        </UpgradeText>
      </CellContent>
    )
  }
}


const CellRenderer = ({
  value: initialValue,
  row,
  column: { id },
  setMaskStatus,
  me,
}) => {
  const [ value, setValue ] = useState(initialValue)

  const onToggle = useCallback(() => {
    trackEvent('dashboard', 'SetMaskStatus', !value)
    setValue(!value)
    setMaskStatus(row.original.name, !value)
  }, [ value, row, setMaskStatus ])

  switch (id) {
    case 'enabled': {
      const iconName = value ? 'check-circle' : 'times-circle'

      return (
        <CellContent>
          <ToggleButton
            isOn={value}
            icon={{ name: iconName }}
            onClick={onToggle}
            tooltip={`Turn this alias ${value ? 'OFF' : 'ON'}`}
          />
          <MaskStatusText>{value ? 'ON' : 'OFF'}</MaskStatusText>
        </CellContent>
      )
    }
    case 'name': {
      return (
        <CellContent>
          <MaskPrefix>
            {value}
          </MaskPrefix>
          <MaskSuffix>
            @{row.original.username}.{DOMAIN}
          </MaskSuffix>
        </CellContent>
      )
    }
    case 'numMessages': {
      return (
        <PremiumCellContent me={me}>
          <MetaData>{value || 0}</MetaData>
        </PremiumCellContent>
      )
    }
    case 'numBytes': {
      return (
        <PremiumCellContent me={me}>
          <MetaData>{bytesToBandwidthStr(value)}</MetaData>
        </PremiumCellContent>
      )
    }
    case 'lastReceived': {
      return (
        <PremiumCellContent me={me}>
          <MetaData>{value ? formatDate(new Date(value), 'MMM d, yyyy') : '-'}</MetaData>
        </PremiumCellContent>
      )
    }
    default:
      return <CellContent>{value}</CellContent>
  }
}


const defaultColumn = {
  Cell: CellRenderer,
}


const MaskTable = ({ items, setMaskStatus, me }) => {
  const data = useMemo(() => items.map(({ name, enabled, stats, username }) => {
    return {
      name,
      enabled,
      username: username.username,
      ...stats,
    }
  }), [ items ])

  const columns = useMemo(() => [
    {
      Header: 'Alias',
      accessor: 'name',
    },
    {
      Header: 'Enabled',
      accessor: 'enabled',
      hint: (
        <HeaderHint>
          <p>Whether email will be forwarded to your real email address.</p>
          <p>If ON then email will be forwarded.</p>
          <p>If OFF then email will be silently discarded. Any replies you send will still work.</p>
        </HeaderHint>
      )
    },
    {
      Header: 'Count',
      accessor: 'numMessages',
      hint: (
        <HeaderHint>
          <p>The number of emails sent and received this calendar month ({thisMonthPeriodStr()}).</p>
        </HeaderHint>
      )
    },
    {
      Header: 'Bandwidth',
      accessor: 'numBytes',
      hint: (
        <HeaderHint>
          <p>The amount of email data (text, html, attachments, etc) sent and received this calendar month ({thisMonthPeriodStr()}).</p>
        </HeaderHint>
      )
    },
    {
      Header: 'Latest',
      accessor: 'lastReceived',
      hint: (
        <HeaderHint>
          <p>When the latest email was sent or received this calendar month ({thisMonthPeriodStr()}).</p>
        </HeaderHint>
      )
    },
  ], [])

  const filterTypes = React.useMemo(
    () => ({
      // Add a new fuzzyTextFilterFn filter type.
      fuzzyText: fuzzyTextFilterFn,
    }),
    []
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    state,
    prepareRow,
    preGlobalFilteredRows,
    setGlobalFilter,
  } = useTable({
    columns,
    data,
    defaultColumn,
    filterTypes,
    setMaskStatus,
    me,
  }, useGlobalFilter, useSortBy)

  return (
    <div>
      <GlobalFilter
        preGlobalFilteredRows={preGlobalFilteredRows}
        globalFilter={state.globalFilter}
        setGlobalFilter={setGlobalFilter}
      />
      <TableContainer>
        <Table {...getTableProps()} cellSpacing="20">
          <thead>
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <HeaderCell {...column.getHeaderProps(column.getSortByToggleProps())}>
                    {column.render('Header')}
                    <span>
                      {column.hint ? (
                        <HeaderHintButton
                          tooltip={column.hint}
                        />
                      ) : null}
                      {/* eslint-disable-next-line no-nested-ternary */}
                      {column.isSorted
                        ? column.isSortedDesc
                          ? <DownArrow />
                          : <UpArrow />
                        : ''}
                    </span>
                  </HeaderCell>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map((row, index) => {
              prepareRow(row)
              return (
                <DataRow {...row.getRowProps()} isEven={index % 2 === 0}>
                  {row.cells.map(cell => {
                    return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                  })}
                </DataRow>
              )
            })}
          </tbody>
        </Table>
      </TableContainer>
    </div>
  )
}


const Container = styled.div``


const Masks = ({ className, me }) => {
  const query = useSafeQuery(GetMyMasksQuery, {
    variables: {
      paging: {
        page: 1,
        resultsPerPage: 1000000
      }
    }
  })

  const [ updateMaskStatus ] = useSafeMutation(UpdateMaskStatusMutation)

  const setMaskStatus = useCallback(async (name, enabled) => {
    const { error } = await updateMaskStatus({
      variables: {
        name,
        enabled,
      }
    })

    if (error) {
      toast.error(`Update error: ${error.message}`)
    }
  }, [ updateMaskStatus ])

  return (
    <Container className={className}>
      {isSelfHosted() ? null : <StyledBandwidthStatsThisMonth me={me} />}
      <QueryResult {...query}>
        {({ result }) => <MaskTable {...result} setMaskStatus={setMaskStatus} me={me} />}
      </QueryResult>
    </Container>
  )
}


export default Masks
