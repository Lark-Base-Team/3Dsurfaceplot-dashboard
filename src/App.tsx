import './App.css';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
    DashboardState, IDataRange,
    AllDataRange, DATA_SOURCE_SORT_TYPE,
    GroupMode, ORDER, SourceType,
    bitable, dashboard, ICategory,
    IConfig, IData, FieldType, ISeries,
    Rollup, IDataCondition
} from "@lark-base-open/js-sdk";
import {
    Form, Tag, Checkbox, Button, Popover, Empty, Tooltip,
    Select, Switch, Notification, Slider, Dropdown,
    Divider, InputNumber, Card, Typography, Tabs, TabPane,
    Spin,
} from '@douyinfe/semi-ui';
import { IconMore } from '@douyinfe/semi-icons';
import classnames from 'classnames'
import * as echarts from 'echarts';
import 'echarts-gl';
import ReactEcharts from 'echarts-for-react';
import produce from 'immer';


interface IFormValues {
    tableId: any;
    dataRange: any;
    y_axis: any;
    rotateSensitivity: number;
    autoRotate: string;
    autoRotateSpeed: number;
    shadowSwitch: boolean;
    tooltipSwitch: boolean;
    gridSwitch: boolean;
    visualMapColor: string;
    visualMapSwitch: boolean;
    visualMapShowSwitch: boolean;
    visualMapItemHeight: number;
    backgroundColor: string;
}

interface ITableSource {
    tableId: string;
    tableName: string;
}

const visualMapColorList = [
    {
        index: '0',
        colors: [
            '#313695',
            '#4575b4',
            '#74add1',
            '#abd9e9',
            '#e0f3f8',
            '#ffffbf',
            '#fee090',
            '#fdae61',
            '#f46d43',
            '#d73027',
            '#a50026'
        ]
    }, {
        index: '1',
        colors: [
            '#8b0000', // 深红色
            '#a01010',
            '#b42626',
            '#c83c3c',
            '#dc5252',
            '#e6e6fa',
            '#5252dc',
            '#3c3cc8',
            '#2626b4',
            '#1010a0',
            '#00008b'  // 深蓝色
        ]
    }, {
        index: '2',
        colors: [
            '#ffff00',
            '#ffff33',
            '#ffff66',
            '#ffff99',
            '#ffffcc',
            '#ffffbf',
            '#ccccff',
            '#9999ff',
            '#6666ff',
            '#3333ff',
            '#0000ff'
        ]
    },
    {
        index: '3',
        colors: [
            '#a8d5ba',
            '#b7ddc6',
            '#c6e4d1',
            '#d5eccd',
            '#e4f3d9',
            '#f0f5e5', // 中间值，近似白色
            '#e4f3f8',
            '#d5e8f5',
            '#c6ddf1',
            '#b7d1ee',
            '#a8c6ea'
        ]
    },
    {
        index: '4',
        colors: [
            '#d4b4da',
            '#dcc0e0',
            '#e4cbe5',
            '#ecd7ea',
            '#f4e2f0',
            '#ffffff', // 中间值，近似白色
            '#f5e7d5',
            '#f1d8c6',
            '#edc9b7',
            '#e9baa8',
            '#e5ab99'
        ]

    }
]

export default function App() {
    const { Title } = Typography;
    const formRef = useRef(null);
    const [initFormValue, setInitFormValue] = useState<IFormValues>();
    const [tableSource, setTableSource] = useState<ITableSource[]>([]);
    const [dataRange, setDataRange] = useState<IDataRange[]>([{ type: SourceType.ALL }]);
    const [categories, setCategories] = useState<ICategory[]>([]);
    const [autoRotateState, setAutoRotateState] = useState('off')
    const [pageTheme, setPageTheme] = useState('LIGHT');
    const [config, setConfig] = useState({
        tableId: '',
        dataRange: { type: 'ALL' },
        y_axis: String,
        x_axis: []
    })
    const [plotOptions, setPlotOptions] = useState({
        tooltip: { show: false },
        visualMap: {
            show: true,
            max: 20,
            calculable: true,
            realtime: true,
            itemWidth: 25,
            itemHeight: 300,
            inRange: {
                color: [
                    '#313695',
                    '#4575b4',
                    '#74add1',
                    '#abd9e9',
                    '#e0f3f8',
                    '#ffffbf',
                    '#fee090',
                    '#fdae61',
                    '#f46d43',
                    '#d73027',
                    '#a50026'
                ]
            }
        },
        xAxis3D: {
            type: 'category',
            data: null
        },
        yAxis3D: {
            type: 'category',
            data: null
        },
        zAxis3D: {
            type: 'value'
        },
        grid3D: {
            show: true,
            boxWidth: 200,
            boxDepth: 80,
            viewControl: {
                projection: 'perspective',//'orthographic',
                autoRotate: false,
                rotateSensitivity: 15,
                autoRotateAfterStill: 1,
                autoRotateSpeed: 10,
            },
            light: {
                main: {
                    intensity: 1.2,
                    shadow: false
                },
                ambient: {
                    intensity: 0.3
                }
            },
            environment: null,
            axisLine: { lineStyle: { color: '#000' } },
        },
        series: [
            {
                type: 'bar3D',
                data: null,
                shading: 'lambert',
                label: {
                    fontSize: 16,
                    borderWidth: 1
                },
                emphasis: {
                    label: {
                        fontSize: 20,
                        color: '#900'
                    },
                    itemStyle: {
                        color: '#900'
                    }
                }
            }
        ]

    })
    const [projection, setProjection] = useState(true);
    const [adjustableForm, setAdjustableForm] = useState([]);

    const isCreate = dashboard.state === DashboardState.Create
    /** 是否配置模式下 */
    const isConfig = dashboard.state === DashboardState.Config || isCreate;

    const getTableList = useCallback(async () => {
        const tables = await bitable.base.getTableList();
        return await Promise.all(tables.map(async table => {
            const name = await table.getName();
            return {
                tableId: table.id,
                tableName: name
            }
        }))
    }, [])

    const getTableRange = useCallback((tableId: string) => {
        return dashboard.getTableDataRange(tableId);
    }, [])

    const getCategories = useCallback((tableId: string) => {
        return dashboard.getCategories(tableId);
    }, [])
    const getViewCategories = async (tableId: string) => {
        const table = await bitable.base.getTableById(tableId);
        const viewMeta = await table.getViewMetaList()
        const defaultView = await table.getViewById(viewMeta[0].id)
        const fieldMeta = await defaultView.getFieldMetaList();
        const visibleFieldIdList = await defaultView.getVisibleFieldIdList();
        let visibleFieldMeta = []
        for (let i = 0; i <= fieldMeta.length - 1; i++) {
            if (visibleFieldIdList.includes(fieldMeta[i].id)) {
                visibleFieldMeta.push({
                    fieldId: fieldMeta[i].id,
                    fieldName: fieldMeta[i].name,
                    fieldType: fieldMeta[i].type
                })
            }
        }
        return visibleFieldMeta;
    }

    useEffect(() => {
        async function a() {
            bitable.bridge.onThemeChange((event) => {
                setPageTheme(event.data.theme);
            });
            const theme = await bitable.bridge.getTheme();
            //console.log('addon detect theme changed', theme)
            setPageTheme(theme);
            setPlotOptions(produce((draft) => {
                theme === 'LIGHT' ? (draft.grid3D.axisLine.lineStyle.color = '#000') : (draft.grid3D.axisLine.lineStyle.color = '#fff')
            }))
        }
        a()
    }, [dashboard.state])

    useEffect(() => {
        const offConfigChange = dashboard.onConfigChange((r) => {
            // 监听配置变化，协同修改配置
            setConfig(r.data.customConfig.config as any);
            setPlotOptions(r.data.customConfig.plotOptions as any)
        });
        return () => {
            offConfigChange();
            console.log('offConfigChange')
        }
    }, []);

    useEffect(() => {
        async function init() {
            const tableList = await getTableList();
            setTableSource(tableList);

            let previewConfig: IDataCondition = {} as IDataCondition
            let formInitValue: IFormValues = {} as IFormValues

            if (dashboard.state === DashboardState.Create) {
                const tableId = tableList[0]?.tableId;
                const tableRanges = (await getTableRange(tableId)).filter(obj => obj.type !== 'ALL')
                setDataRange(tableRanges)

                const table = await bitable.base.getTableById(tableId);
                const viewMeta = await table.getViewMetaList()
                const defaultView = await table.getViewById(viewMeta[0].id)
                const fieldMeta = await defaultView.getFieldMetaList();
                const visibleRecordIdList = await defaultView.getVisibleRecordIdList();
                const visibleFieldIdList = await defaultView.getVisibleFieldIdList();
                let visibleFieldMeta = []
                for (let i = 0; i <= fieldMeta.length - 1; i++) {
                    if (visibleFieldIdList.includes(fieldMeta[i].id)) {
                        visibleFieldMeta.push({
                            fieldId: fieldMeta[i].id,
                            fieldName: fieldMeta[i].name,
                            fieldType: fieldMeta[i].type
                        })
                    }
                }
                setCategories(visibleFieldMeta)

                const adjustableFormList = visibleFieldMeta
                    .filter((item, index) => index !== 0)
                    .filter((item, index) =>
                        item.fieldType === 2 ||
                        item.fieldType === 20 ||
                        item.fieldType === 99002 ||
                        item.fieldType === 99003 ||
                        item.fieldType === 99004
                    )
                    .map((item, index) => {
                        return { ...item, calcu: 'MAX' }
                    })
                //console.log('adjustableFormList', adjustableFormList)
                setAdjustableForm(adjustableFormList)

                const previewConfig = {
                    tableId: tableId,
                    dataRange: tableRanges[0],
                    series: [],//[{fieldId:item.fieldId, rollup: Rollup.SUM}],
                    groups: [{
                        fieldId: visibleFieldIdList[0],
                        mode: GroupMode.INTEGRATED,//GroupMode.ENUMERATED,//
                        sort: { order: ORDER.ASCENDING, sortType: DATA_SOURCE_SORT_TYPE.VIEW }
                    }]
                }
                let series = []
                adjustableFormList.map((item, index) => {
                    series.push({ fieldId: item.fieldId, rollup: item.calcu })
                })
                previewConfig.series = series
                console.log(previewConfig)
                const data = await dashboard.getPreviewData(previewConfig)
                let _xyz_data = [], _x_index_name = [], _y_index_name = [];
                let maxValue = -Infinity; // 初始化为负无穷大
                let minValue = Infinity; // 初始化为正无穷大
                data.map((record, index) => {
                    if (index !== 0) {
                        _y_index_name.push(record[0].text)
                        record.map((item, idx) => {
                            if (idx !== 0) {
                                _xyz_data.push([idx - 1, index - 1, item.value])
                                if (Number(item.value) > maxValue) { maxValue = Number(item.value) }
                                if (Number(item.value) < minValue) { minValue = Number(item.value) }
                            }
                        })
                    } else if (index === 0) {
                        record.map((item, idx) => {
                            idx !== 0 ? (_x_index_name.push(item.text)) : (null)
                        })
                    }

                })
                setPlotOptions(produce((draft) => {
                    draft.visualMap.max = maxValue + maxValue * 0.1
                    draft.visualMap.min = minValue - minValue * 0.1
                    draft.series[0].data = _xyz_data
                    draft.xAxis3D.data = _x_index_name
                    draft.yAxis3D.data = _y_index_name
                }))

                formInitValue = {
                    ...formInitValue,
                    tableId: tableList[0]?.tableId,
                    dataRange: tableRanges[0],
                    y_axis: visibleFieldMeta[0]?.fieldId,
                    rotateSensitivity: 15,
                    autoRotate: 'off',
                    autoRotateSpeed: 10,
                    shadowSwitch: false,
                    tooltipSwitch: false,
                    gridSwitch: true,
                    visualMapColor: '0',
                    visualMapSwitch: true,
                    visualMapShowSwitch: true,
                    visualMapItemHeight: 300,
                    backgroundColor: 'transparent'
                }
                setConfig((prevConfig) => ({
                    ...prevConfig,
                    tableId: tableId,
                    dataRange: tableRanges[0],
                    y_axis: visibleFieldMeta[0]?.fieldId,
                    x_axis: adjustableFormList
                }))

            } else {
                const dbConfig = await dashboard.getConfig();
                const { dataConditions, customConfig } = dbConfig;
                let config = customConfig.config as any
                console.log(config)
                let plotOptions = customConfig.plotOptions as any
                setConfig(config)
                setAdjustableForm(config.x_axis)
                setPlotOptions(plotOptions)
                console.log(plotOptions)

                let { tableId, dataRange, groups, series } = dataConditions[0];
                const tableRanges = (await getTableRange(tableId)).filter(obj => obj.type !== 'ALL')
                setDataRange(tableRanges)
                const viewCategories = await getViewCategories(tableId)
                setCategories(viewCategories);
                console.log(viewCategories)
                previewConfig = {
                    tableId: tableId,
                    dataRange: dataRange,
                    series: series,
                    groups: groups
                }
                formInitValue = {
                    ...formInitValue,
                    tableId: tableId,
                    dataRange: typeof (dataRange) === 'string' ?
                        (JSON.parse(dataRange)) : (dataRange),
                    y_axis: config.y_axis,
                    rotateSensitivity: plotOptions.grid3D.viewControl.rotateSensitivity,
                    autoRotate: plotOptions.grid3D.viewControl.autoRotate === false ?
                        ('off') : (plotOptions.grid3D.viewControl.autoRotateDirection),
                    autoRotateSpeed: plotOptions.grid3D.viewControl.autoRotateSpeed,
                    shadowSwitch: plotOptions.grid3D.light.main.shadow,
                    tooltipSwitch: plotOptions.tooltip.show,
                    gridSwitch: plotOptions.grid3D.show,
                    visualMapColor: String(visualMapColorList.findIndex((obj, index) => JSON.stringify(obj.colors) === JSON.stringify(plotOptions.visualMap.inRange.color))),
                    visualMapSwitch: (plotOptions.visualMap.inRange.color).length === 1 ? (false) : (true),
                    visualMapShowSwitch: plotOptions.visualMap.show,
                    visualMapItemHeight: plotOptions.visualMap.itemHeight,
                    backgroundColor: plotOptions.grid3D.environment !== null ?
                        (plotOptions.grid3D.environment === '#000' ? ('black') : ('example')) :
                        ('transparent')
                }
            }
            setInitFormValue(formInitValue)
            console.log(formInitValue)
        }

        if (dashboard.state === DashboardState.Config || dashboard.state === DashboardState.Create) {
            init()
        } else if (dashboard.state === DashboardState.View) {
            // only after create

            async function initView() {
                const dbConfig = await dashboard.getConfig();
                const { customConfig, dataConditions } = dbConfig
                let config = customConfig.config as any
                let plotOptions = customConfig.plotOptions as any
                console.log('view', config, plotOptions)
                setConfig(config)
                setAdjustableForm(config.x_axis)
                setPlotOptions(plotOptions)
            }
            initView()
        }
        console.log('init func, dashboard state: ', dashboard.state)
    }, [])


    useEffect(() => {
        async function resetPlotOptions(tableId: string, viewId: string) {
            /*
            const table = await bitable.base.getTableById(tableId);
            //const viewMeta = await table.getViewMetaList()
            const defaultView = await table.getViewById(viewId)
            const fieldMeta = await defaultView.getFieldMetaList();
            const visibleRecordIdList = await defaultView.getVisibleRecordIdList();
            const visibleFieldIdList = await defaultView.getVisibleFieldIdList();
            let visibleFieldMeta = []
            let x_index = []
            let x_index_name = []
            for (let i = 0; i <= fieldMeta.length - 1; i++) {
                if (visibleFieldIdList.includes(fieldMeta[i].id)) {
                    visibleFieldMeta.push({
                        fieldId: fieldMeta[i].id,
                        fieldName: fieldMeta[i].name,
                        fieldType: fieldMeta[i].type
                    })
                    if (i !== 0) {
                        x_index.push(fieldMeta[i])
                        x_index_name.push(fieldMeta[i].name)
                    }
                }
            }
            let y_index = []
            let y_index_name = []
            const indexField = await table.getFieldById(visibleFieldIdList[0])
            for (let recordId of visibleRecordIdList) {
                let cellContent = await (await indexField.getCell(recordId)).getValue()
                if (cellContent) {
                    if (cellContent[0].text) {
                        y_index.push({ text: cellContent[0].text, id: recordId })
                        y_index_name.push(cellContent[0].text)
                    }
                }
            }
            let xyz_data = []
            Promise.all(x_index.map((x_item, x_index) => {
                return table.getFieldById(x_item.id).then(field => {
                    return Promise.all(y_index.map((y_item, y_index) => {
                        return field.getCell(y_item.id).then(cell => {
                            return cell.getValue().then(cellContent => {
                                let a = [x_index, y_index, cellContent];
                                xyz_data.push(a);
                            });
                        });
                    }));
                });
            })).then(() => {
                console.log(xyz_data, x_index_name, y_index_name)
                setPlotOptions(produce((draft) => {
                    draft.series[0].data = xyz_data
                    draft.xAxis3D.data = x_index_name
                    draft.yAxis3D.data = y_index_name
                }))
            });
            */
            const previewConfig = {
                tableId: config.tableId,
                dataRange: config.dataRange as any,
                series: [],//[{fieldId:item.fieldId, rollup: Rollup.SUM}],
                groups: [{
                    fieldId: config.y_axis as any,
                    mode: GroupMode.INTEGRATED,//GroupMode.ENUMERATED,//
                    sort: { order: ORDER.ASCENDING, sortType: DATA_SOURCE_SORT_TYPE.VIEW }
                }]
            }

            let series = []
            adjustableForm.map((item, index) => {
                series.push({ fieldId: item.fieldId, rollup: item.calcu })
            })
            previewConfig.series = series
            const data = await dashboard.getPreviewData(previewConfig)
            //console.log('get preview data', data)
            //console.log('y_axis', config.y_axis)
            //console.log('adjustableForm', adjustableForm)
            let _xyz_data = [], _x_index_name = [], _y_index_name = [];
            let maxValue = -Infinity; // 初始化为负无穷大
            let minValue = Infinity; // 初始化为正无穷大
            data.map((record, index) => {
                if (index !== 0) {
                    _y_index_name.push(record[0].text)
                    record.map((item, idx) => {
                        if (idx !== 0) {
                            _xyz_data.push([idx - 1, index - 1, item.value])
                            if (Number(item.value) > maxValue) { maxValue = Number(item.value) }
                            if (Number(item.value) < minValue) { minValue = Number(item.value) }
                        }
                    })
                } else if (index === 0) {
                    record.map((item, idx) => {
                        idx !== 0 ? (_x_index_name.push(item.text)) : (null)
                    })
                }

            })
            //console.log(_xyz_data, _x_index_name, _y_index_name)
            setPlotOptions(produce((draft) => {
                draft.visualMap.max = maxValue + maxValue * 0.1
                draft.visualMap.min = minValue - minValue * 0.1
                draft.series[0].data = _xyz_data
                draft.xAxis3D.data = _x_index_name
                draft.yAxis3D.data = _y_index_name
            }))

        }

        if (config.tableId !== '' && config.dataRange) {
            console.log('resetPlotOptions', config, plotOptions)
            resetPlotOptions(config.tableId, (config.dataRange as any as { viewId: string }).viewId)
        }

    }, [config.tableId, config.dataRange, config.y_axis, config.x_axis])

    //useEffect(() => {
    //    console.log('plotOptions', plotOptions)
    //}, [plotOptions])

    useEffect(() => {
        setConfig(produce((draft) => {
            draft.x_axis = adjustableForm
        }))
    }, [adjustableForm])

    const onClick = () => {
        console.log(config)
        // 保存配置
        dashboard.saveConfig({
            customConfig: { config: config, plotOptions: plotOptions },
            dataConditions: [{
                tableId: config.tableId,
                dataRange: config.dataRange,
                series: 'COUNTA',
                groups: [
                    {
                        fieldId: categories[0],
                        mode: GroupMode.INTEGRATED,
                        sort: {
                            order: ORDER.ASCENDING,
                            sortType: DATA_SOURCE_SORT_TYPE.VIEW
                        }
                    }
                ]
            }],
        } as any)
    }
    const handleConfigChange = async (values: any, changedField: any) => {
        if (changedField.tableId) {
            const tableRanges = (await getTableRange(changedField.tableId)).filter(obj => obj.type !== 'ALL')
            setDataRange(tableRanges)
            const categories = await getViewCategories(changedField.tableId);
            setCategories(categories);
            setConfig(produce((draft) => {
                draft.tableId = changedField.tableId
                draft.dataRange = JSON.parse(categories[0])
            }))
            if (formRef.current) {
                formRef.current.formApi.setValue('dataRange', JSON.stringify(tableRanges[0]))
            }
        } else if (changedField.dataRange) {
            setConfig(produce((draft) => {
                draft.dataRange = JSON.parse(changedField.dataRange)
            }))
        } else if (changedField.y_axis) {
            setConfig(produce((draft) => {
                draft.y_axis = changedField.y_axis
            }));
        } else if (changedField.rotateSensitivity) {
            setPlotOptions(produce((draft) => {
                draft.grid3D.viewControl.rotateSensitivity = changedField.rotateSensitivity
            }))
        } else if (changedField.autoRotate) {
            setAutoRotateState(changedField.autoRotate)
            if (changedField.autoRotate === 'off') {
                setPlotOptions(produce((draft) => {
                    draft.grid3D.viewControl.autoRotate = false
                }))
            } else {
                setPlotOptions(produce((draft) => {
                    draft.grid3D.viewControl.autoRotate = true
                    draft.grid3D.viewControl.autoRotateDirection = changedField.autoRotate
                }))
            }
        } else if (changedField.autoRotateSpeed) {
            setPlotOptions(produce((draft) => {
                draft.grid3D.viewControl.autoRotateSpeed = changedField.autoRotateSpeed
            }))
        } else if (changedField.shadowSwitch === true || changedField.shadowSwitch === false) {
            setPlotOptions(produce((draft) => {
                draft.grid3D.light.main.shadow = changedField.shadowSwitch
            }))
        } else if (changedField.tooltipSwitch === true || changedField.tooltipSwitch === false) {
            setPlotOptions(produce((draft) => {
                draft.tooltip.show = changedField.tooltipSwitch
            }))
        } else if (changedField.gridSwitch === true || changedField.gridSwitch === false) {
            setPlotOptions(produce((draft) => {
                draft.grid3D.show = changedField.gridSwitch
            }))
        } else if (changedField.visualMapColor) {
            setPlotOptions(produce((draft) => {
                draft.visualMap.inRange.color = visualMapColorList[Number(changedField.visualMapColor)].colors
            }))
        } else if (changedField.visualMapSwitch === true || changedField.visualMapSwitch === false) {
            //console.log(plotOptions.series[0].data)
            setPlotOptions(produce((draft) => {
                changedField.visualMapSwitch === false ?
                    (draft.visualMap.inRange = {
                        color: ['#454AAf']
                    }) :
                    (draft.visualMap.inRange = {
                        color: [
                            '#313695',
                            '#4575b4',
                            '#74add1',
                            '#abd9e9',
                            '#e0f3f8',
                            '#ffffbf',
                            '#fee090',
                            '#fdae61',
                            '#f46d43',
                            '#d73027',
                            '#a50026'
                        ]
                    })
            }))
        } else if (changedField.visualMapShowSwitch === true || changedField.visualMapShowSwitch === false) {
            setPlotOptions(produce((draft) => {
                draft.visualMap.show = changedField.visualMapShowSwitch
            }))
        } else if (changedField.visualMapItemHeight) {
            setPlotOptions(produce((draft) => {
                draft.visualMap.itemHeight = changedField.visualMapItemHeight
            }))
        } else if (changedField.backgroundColor) {
            if (changedField.backgroundColor === 'black') {
                setPlotOptions(produce((draft) => {
                    draft.grid3D.environment = '#000'
                }))
            } if (changedField.backgroundColor === 'example') {
                setPlotOptions(produce((draft) => {
                    draft.grid3D.environment = new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                        offset: 0, color: '#00aaff' // 天空颜色
                    }, {
                        offset: 0.7, color: '#998866' // 地面颜色
                    }, {
                        offset: 1, color: '#998866' // 地面颜色
                    }], false)
                }))
            } if (changedField.backgroundColor === 'transparent') {
                setPlotOptions(produce((draft) => {
                    draft.grid3D.environment = null
                }))
            }

        }

    };

    const renderCustomOption_tableSVG = (item: any) => {
        return (
            <Select.Option
                value={item.tableId}
                showTick={false}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src='./table.svg' />
                    {item.tableName}
                </div>
            </Select.Option>
        )
    };
    const renderCustomOption_tableSVG_dataRange = (item: any) => {
        return item.type === 'VIEW' ? (
            <Select.Option
                value={JSON.stringify(item)}
                showTick={false}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src='./table.svg' />
                    {item.viewName}
                </div>
            </Select.Option>
        ) : (
            <Select.Option
                value={JSON.stringify(item)}
                showTick={false}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src='./table.svg' />
                    全部数据
                </div>
            </Select.Option>
        )
    };
    const renderCustomOption_col = (item: any) => {
        let iconPath = ''
        switch (item.fieldType) {
            case FieldType.NotSupport:
                iconPath = '';
                break;
            case FieldType.Text:
                iconPath = './text.svg'; // 设置多行文本图标路径
                break;
            case FieldType.Number:
                iconPath = './number.svg'; // 设置数字图标路径
                break;
            case FieldType.SingleSelect:
                iconPath = ''; // 设置单选图标路径
                break;
            case FieldType.MultiSelect:
                iconPath = ''; // 设置多选图标路径
                break;
            case FieldType.DateTime:
                iconPath = './date.svg'; // 设置日期图标路径
                break;
            case FieldType.Checkbox:
                iconPath = './checkbox.svg'; // 设置复选框图标路径
                break;
            case FieldType.User:
                iconPath = './person.svg'; // 设置人员图标路径
                break;
            case FieldType.Phone:
                iconPath = './phoneNumber.svg'; // 设置电话图标路径
                break;
            case FieldType.Url:
                iconPath = './URL.svg'; // 设置超链接图标路径
                break;
            case FieldType.Email:
                iconPath = './Email.svg'; // 设置電子郵件图标路径
                break;
            case FieldType.Progress:
                iconPath = './progress.svg'; // 设置进度条图标路径
                break;
            case FieldType.Currency:
                iconPath = './currency.svg'; // 设置货币图标路径
                break;
            case FieldType.Rating:
                iconPath = './rating.svg'; // 设置评分图标路径
                break;
            case FieldType.Formula:
                iconPath = './formula.svg'; // 设置公式图标路径
                break;
            default:
                iconPath = ''; // 默认图标路径或处理
                break;
        }
        return (
            <Select.Option
                value={item.fieldId}
                showTick={false}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={iconPath} />
                    {item.fieldName}
                </div>

            </Select.Option>
        )
    };
    const addFieldButtonClick = (fieldId) => {
        //console.log(fieldId)
        for (let field of categories) {
            if (field.fieldId === fieldId) {
                setAdjustableForm([...adjustableForm, { fieldId: field.fieldId, fieldName: field.fieldName, fieldType: field.fieldType, calcu: 'MAX' }])
                break
            }
        }
    };
    const calcuDropdownChange = (value, index) => {
        //console.log(value, index)
        const updatedForm = adjustableForm.map((item, idx) => {
            if (idx === index) {
                return { ...item, calcu: value };
            }
            return item;
        })
        setAdjustableForm(updatedForm);
    };
    const moveDropdownChange = (value, index) => {
        //console.log(value, index, index === (adjustableForm.length - 1))
        if (value === 'DELET') {
            setAdjustableForm(prevItems => prevItems.filter((_, i) => i !== index));
        } if (value === 'UP') {
            setAdjustableForm(prevItems => {
                const [movedItem] = prevItems.splice(index, 1);
                prevItems.splice(index - 1, 0, movedItem);
                return [...prevItems];
            });
        } if (value === 'DOWN') {
            setAdjustableForm(prevItems => {
                const [movedItem] = prevItems.splice(index, 1);
                prevItems.splice(index + 1, 0, movedItem);
                return [...prevItems];
            });
        }
    }
    const DOWNindexDisabled = (index) => {
        //console.log(index, adjustableForm.length - 1 === index)
        if (adjustableForm.length - 1 === index) {
            return true
        } else {
            return false
        }
    };
    const fieldSelectChange = (value, index) => {
        //console.log(value, index)
        const updatedForm = adjustableForm.map((item, idx) => {
            if (idx === index) {
                const foundItem = categories.find(item => item.fieldId === value);
                if (foundItem) {
                    return {
                        ...item,
                        fieldId: value,
                        fieldName: foundItem.fieldName,
                        fieldType: foundItem.fieldType
                    };
                }
            }
            return item;
        })
        setAdjustableForm(updatedForm);
    };
    const allFieldCalcuChange = (value) => {
        const updatedForm = adjustableForm.map((item, idx) => {
            return { ...item, calcu: value }
        })
        setAdjustableForm(updatedForm);
    }
    const triggerRender0 = ({ value, ...rest }) => {
        return (
            <Button
                theme="borderless"
                type="primary"
                style={{ display: 'flex', alignItems: 'center', height: '90%', marginRight: '3px' }}
            >
                {value.map(item => item.label).join(' , ')}
            </Button>
        );
    };
    const triggerRender1 = ({ value, ...rest }) => {
        return (
            <Button
                theme="borderless"
                type="primary"
                style={{ display: 'flex', alignItems: 'center', height: '90%', marginRight: '3px' }}
            >
                <IconMore style={{ display: 'flex', alignItems: 'center' }} />
            </Button>
        );
    };
    const triggerRender2 = ({ value, ...rest }) => {
        return (
            <div style={{ width: '80px', fontWeight: 'bold', fontSize: '14px', color: 'rgb(80 132 245)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                添加字段
            </div>
        );
    };
    const triggerRender3 = ({ value, ...rest }) => {
        return (
            <div style={{ width: '120px', fontWeight: 'bold', fontSize: '14px', color: 'rgb(80 132 245)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                更改所有计算方法
            </div>
        );
    };
    const fieldDropdownClick = (event) => {
        //console.log(event)
    }



    return (
        <main className={classnames({
            'main-config': dashboard.state === DashboardState.Config || dashboard.state === DashboardState.Create,
            'main': true,
        })}>
            <div className='content'>
                {plotOptions.series[0].data ? (
                    <ReactEcharts
                        option={plotOptions}
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'canvas' }}
                    />
                ) : (
                    <Spin
                        size='large'
                        indicator={<div style={{ fontSize: '50px' }}>🤔</div>}
                        tip={<p>👆this is only a loading icon👆</p>}
                        style={{ width: '50%' }}
                    ></Spin>
                )}
            </div>

            {dashboard.state === DashboardState.Config || dashboard.state === DashboardState.Create ? (
                <div style={{ position: 'relative' }}>
                    <div
                        className='config-panel'
                        style={{
                            '--scrollbar-thumb-bg': pageTheme === 'DARK' ? ('#797B7F') : ('#BBBDBE'),
                            '--scrollbar-thumb-hover-bg': pageTheme === 'DARK' ? ('#BBBDBE') : ('#797B7F'),
                            overflowY: 'scroll', // 仅纵向滚动
                            overflowX: 'hidden', // 禁止横向滚动
                            paddingLeft: '15px',
                            flex: '1 1 auto', // 自动扩展并占据剩余空间
                            maxHeight: 'calc(100vh - 60px)', // 确保内容区高度不超过100vh减去按钮区高度
                            paddingTop: '0px'
                        } as React.CSSProperties}
                    >
                        <Tabs type="line" className={pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')}>
                            <TabPane tab="数据配置" itemKey="0" style={{ paddingRight: '10px' }}>
                                {tableSource[0] && dataRange[0] && initFormValue?.tableId ? (
                                    <Form
                                        className={pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')}
                                        layout='vertical'
                                        style={{ width: 300 }}
                                        ref={formRef}
                                        onValueChange={handleConfigChange}
                                    >
                                        <Form.Select
                                            dropdownClassName={`${pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                            field='tableId'
                                            label='数据源'
                                            initValue={initFormValue.tableId}
                                            style={{ width: '100%', display: 'flex' }}
                                            searchPosition='dropdown'
                                            filter
                                            clickToHide
                                        >
                                            {tableSource.map(source => renderCustomOption_tableSVG(source))}
                                        </Form.Select>
                                        <Form.Select
                                            dropdownClassName={`${pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                            field='dataRange'
                                            label='数据范围'
                                            initValue={JSON.stringify(initFormValue.dataRange)}
                                            style={{ width: '100%' }}
                                            searchPosition='dropdown'
                                            filter
                                            clickToHide
                                        >
                                            {dataRange.map(view => renderCustomOption_tableSVG_dataRange(view))}
                                        </Form.Select>
                                        <Form.Select
                                            dropdownClassName={`${pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                            field='y_axis'
                                            label='Y轴'
                                            style={{ width: '100%' }}
                                            searchPosition='dropdown'
                                            filter
                                            clickToHide
                                            initValue={initFormValue.y_axis}
                                        >
                                            {categories.map(field => renderCustomOption_col(field))}
                                        </Form.Select>

                                        <Form.Slot label='X轴'>
                                            {/* 
                                            <div style={{ width: '100%', overflowWrap: 'break-word' }}>{JSON.stringify(adjustableForm)}</div>
                                            */}
                                            <Form layout='vertical'>
                                                {adjustableForm.map((form, index) => (
                                                    <Form.Select
                                                        noLabel
                                                        labelPosition='left'
                                                        field={String(index)}
                                                        fieldStyle={{ paddingTop: '2px', paddingBottom: '2px' }}
                                                        style={{ width: '100%', overflowY: 'hidden', overflowX: 'hidden' }}
                                                        emptyContent={null}
                                                        showArrow={false}
                                                        prefix={
                                                            <Select
                                                                dropdownClassName={`${pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                                dropdownStyle={{ width: '120%' }}
                                                                filter
                                                                clickToHide
                                                                showArrow={false}
                                                                borderless={true}
                                                                searchPosition='dropdown'
                                                                value={adjustableForm[index].fieldId}
                                                                onChange={(value) => fieldSelectChange(value, index)}
                                                                style={{ display: 'flex', width: '190px', marginLeft: '10px', borderColor: '#ffffff00' }}

                                                            >
                                                                {categories.map(field =>
                                                                    field.fieldType === FieldType.Number ||
                                                                        field.fieldType === FieldType.Formula ||
                                                                        field.fieldType === FieldType.Progress ||
                                                                        field.fieldType === FieldType.Currency ||
                                                                        field.fieldType === FieldType.Rating
                                                                        ?
                                                                        (renderCustomOption_col(field)) : (null))}
                                                            </Select>
                                                        }
                                                        suffix={
                                                            <div style={{ display: 'flex', flexDirection: 'row', position: 'relative' }}>
                                                                <Tooltip content={<div style={{ display: 'flex', textAlign: 'center' }}>仅在索引字段中有重复记录时有效<br />🤪</div>} position='topRight'>
                                                                    <Select
                                                                        dropdownClassName={`${pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                                        dropdownStyle={{ borderColor: '#ffffff00' }}
                                                                        prefix={''}
                                                                        showArrow={false}
                                                                        triggerRender={triggerRender0}
                                                                        onDropdownVisibleChange={fieldDropdownClick}
                                                                        onChange={(value) => calcuDropdownChange(value, index)}
                                                                        clickToHide
                                                                        size='small'
                                                                        value={adjustableForm[index].calcu}
                                                                        style={{ display: 'flex', alignItems: 'center' }}
                                                                    >
                                                                        <Select.Option value={'SUM'}>求和</Select.Option>
                                                                        <Select.Option value={'MAX'}>最大值</Select.Option>
                                                                        <Select.Option value={'MIN'}>最小值</Select.Option>
                                                                        <Select.Option value={'AVERAGE'}>平均值</Select.Option>
                                                                    </Select>
                                                                </Tooltip>

                                                                <Select
                                                                    dropdownClassName={`${pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                                    dropdownStyle={{ borderColor: '#ffffff00' }}
                                                                    prefix={''}
                                                                    onDropdownVisibleChange={fieldDropdownClick}
                                                                    onChange={(value) => moveDropdownChange(value, index)}
                                                                    showArrow={false}
                                                                    triggerRender={triggerRender1}
                                                                    clickToHide
                                                                    size='small'
                                                                    value={''}
                                                                    style={{ display: 'flex', alignItems: 'center' }}
                                                                >
                                                                    <Select.Option value={'UP'} showTick={false} disabled={index === 0}>上移字段</Select.Option>
                                                                    <Select.Option value={'DOWN'} showTick={false} disabled={adjustableForm.length - 1 === index}>下移字段</Select.Option>
                                                                    <Select.Option value={'DELET'} showTick={false}>移除字段</Select.Option>
                                                                </Select>

                                                            </div>
                                                        }

                                                    />
                                                ))}
                                            </Form>
                                        </Form.Slot>
                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
                                            <Tooltip content={'修改当前所有字段的计算方法'} position='bottom'>
                                                <Select
                                                    dropdownClassName={`${pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                    dropdownStyle={{ borderColor: '#ffffff00' }}
                                                    showArrow={false}
                                                    size='small'
                                                    borderless={true}
                                                    style={{ width: '120px', overflowY: 'hidden', borderColor: '#ffffff00', marginRight: '10px' }}
                                                    clickToHide
                                                    triggerRender={triggerRender3}
                                                    onChange={allFieldCalcuChange}
                                                >
                                                    <Select.Option value={'SUM'}>求和</Select.Option>
                                                    <Select.Option value={'MAX'}>最大值</Select.Option>
                                                    <Select.Option value={'MIN'}>最小值</Select.Option>
                                                    <Select.Option value={'AVERAGE'}>平均值</Select.Option>
                                                </Select>
                                            </Tooltip>
                                            <Tooltip content={'仅支持选择数字字段'} position='bottomRight'>
                                                <Select
                                                    dropdownClassName={`${pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                    searchPosition='dropdown'
                                                    filter
                                                    showArrow={false}
                                                    size='small'
                                                    borderless={true}
                                                    style={{ width: '80px', overflowY: 'hidden', borderColor: '#ffffff00' }}
                                                    clickToHide
                                                    triggerRender={triggerRender2}
                                                    onChangeWithObject={false}
                                                    onChange={addFieldButtonClick}

                                                >
                                                    {categories.map(field =>
                                                        field.fieldType === FieldType.Number ||
                                                            field.fieldType === FieldType.Formula ||
                                                            field.fieldType === FieldType.Progress ||
                                                            field.fieldType === FieldType.Currency ||
                                                            field.fieldType === FieldType.Rating
                                                            ?
                                                            (renderCustomOption_col(field)) : (null))}
                                                </Select>
                                            </Tooltip>
                                        </div>


                                    </Form>
                                ) : null}
                            </TabPane>
                            <TabPane tab='样式配置' itemKey='1' style={{ paddingRight: '10px' }}>
                                {tableSource[0] && dataRange[0] && initFormValue?.tableId ? (
                                    <Form
                                        className={pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')}
                                        layout='vertical'
                                        style={{ width: 300 }}
                                        ref={formRef}
                                        onValueChange={handleConfigChange}
                                    >
                                        <Divider margin='12px' align='center'>
                                            <div style={{ fontSize: '12px', fontWeight: 'bold', opacity: 0.6 }}>基础控制</div>
                                        </Divider>

                                        <Form.Select
                                            dropdownClassName={`${pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                            field='backgroundColor'
                                            label='图表背景'
                                            initValue={initFormValue.backgroundColor}
                                            style={{ width: '100%' }}
                                            clickToHide
                                        >
                                            <Select.Option value={'transparent'}>透明</Select.Option>
                                            <Select.Option value={'black'}>黑色</Select.Option>
                                            <Select.Option
                                                value={'example'}
                                                label={
                                                    <div style={{ display: 'flex', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ height: '15px', width: '220px', background: 'linear-gradient(to right, #00aaff 0%, #998866 100%)' }}></div>
                                                    </div>
                                                }
                                            >示例颜色</Select.Option>
                                        </Form.Select>
                                        <Form.Slider
                                            field='rotateSensitivity'
                                            label='鼠标旋转灵敏度'
                                            initValue={initFormValue.rotateSensitivity}
                                            max={30}
                                            showBoundary={true}
                                            handleDot={{ size: '10px', color: 'lightblue' } as any}
                                        ></Form.Slider>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                            <div style={{ width: '50%' }}>
                                                <Form.Switch
                                                    field='shadowSwitch'
                                                    label='阴影'
                                                    initValue={initFormValue.shadowSwitch}
                                                ></Form.Switch>
                                            </div>
                                            <div style={{ width: '50%' }}>
                                                <Form.Select
                                                    dropdownClassName={`${pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                    field='autoRotate'
                                                    label='自动旋转'
                                                    initValue={initFormValue.autoRotate}
                                                    clickToHide
                                                >
                                                    <Select.Option value={'off'}>关闭</Select.Option>
                                                    <Select.Option value={'cw'}>向右旋转</Select.Option>
                                                    <Select.Option value={'ccw'}>向左旋转</Select.Option>
                                                </Form.Select>
                                            </div>
                                        </div>
                                        {autoRotateState !== 'off' ? (
                                            <Form.Slider
                                                field='autoRotateSpeed'
                                                label='自动旋转速度'
                                                initValue={initFormValue.autoRotateSpeed}
                                                min={1}
                                                max={90}
                                                showBoundary={true}
                                                tipFormatter={v => (`${v}°/s`)}
                                                handleDot={{ size: '10px', color: 'lightblue' } as any}
                                            ></Form.Slider>
                                        ) : (null)}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                            <div style={{ width: '50%' }}>
                                                <Form.Switch
                                                    field='tooltipSwitch'
                                                    label='提示框显示'
                                                    initValue={initFormValue.tooltipSwitch}
                                                ></Form.Switch>
                                            </div>
                                            <div style={{ width: '50%' }}>
                                                <Form.Switch
                                                    field='gridSwitch'
                                                    label='坐标轴显示'
                                                    initValue={initFormValue.gridSwitch}
                                                ></Form.Switch>
                                            </div>
                                        </div>

                                        <Divider margin='12px' align='center'>
                                            <div style={{ fontSize: '12px', fontWeight: 'bold', opacity: 0.6 }}>数据映射</div>
                                        </Divider>

                                        <Form.Select
                                            dropdownClassName={`${pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                            field='visualMapColor'
                                            label='映射颜色'
                                            initValue={initFormValue.visualMapColor}
                                            style={{ width: '100%' }}
                                            clickToHide
                                        >
                                            {visualMapColorList.map((obj) =>
                                                <Select.Option
                                                    value={obj.index}
                                                    label={
                                                        <div style={{ display: 'flex', borderRadius: '3px', overflow: 'hidden' }}>
                                                            {obj.colors.map((color) => (
                                                                <div style={{ backgroundColor: color, height: '15px', width: '20px' }} />
                                                            ))}
                                                        </div>
                                                    }
                                                ></Select.Option>
                                            )}
                                        </Form.Select>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                            <div style={{ width: '50%' }}>
                                                <Form.Switch
                                                    field='visualMapShowSwitch'
                                                    label='数值映射条显示'
                                                    initValue={initFormValue.visualMapShowSwitch}
                                                ></Form.Switch>
                                            </div>
                                            <div style={{ width: '50%' }}>
                                                <Form.Switch
                                                    field='visualMapSwitch'
                                                    label='数值颜色映射'
                                                    initValue={initFormValue.visualMapSwitch}
                                                ></Form.Switch>
                                            </div>
                                        </div>
                                        {plotOptions.visualMap.show ? (
                                            <Form.Slider
                                                field='visualMapItemHeight'
                                                label='控制条高度'
                                                initValue={initFormValue.visualMapItemHeight}
                                                min={0}
                                                max={600}
                                                showBoundary={true}
                                                handleDot={{ size: '10px', color: 'lightblue' } as any}
                                            ></Form.Slider>
                                        ) : (null)}


                                        {/*<Form.Slot
                                    label='投影方式'
                                >
                                    <Title heading={6} style={{ margin: 8 }}>
                                        {projection ? '透视投影' : '正交投影'}
                                    </Title>
                                    <Switch
                                        checked={!projection}
                                        onChange={() => {
                                            setProjection(!projection)
                                            setPlotOptions(produce((draft) => {
                                                projection === false ?
                                                    (draft.grid3D.viewControl.projection = 'perspective') :
                                                    (draft.grid3D.viewControl.projection = 'orthographic')
                                            }))
                                        }}
                                    />
                                </Form.Slot>
                                */}
                                    </Form>
                                ) : null}
                            </TabPane>
                        </Tabs>

                    </div>
                    <div
                        className={pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')}
                        style={{
                            display: 'flex', justifyContent: 'flex-end',
                            bottom: '0', height: '50px', flexShrink: '0', // 防止高度收缩
                            borderLeft: '1px solid rgba(222, 224, 227, 0.15)',
                            paddingRight: '15px', gap: '10px',
                        }}
                    >
                        <Button
                            className='btn'
                            size="default"
                            type="primary"
                            theme='solid'
                            style={{ width: '80px' }}
                            onClick={onClick}
                        >
                            确定
                        </Button>
                    </div>
                </div>
            ) : null}
        </main>
    )
}