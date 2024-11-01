import './App.css';
import { useCallback, useEffect, useState } from 'react';
import { DashboardState, IDataRange, DATA_SOURCE_SORT_TYPE, GroupMode, ORDER, SourceType, bitable, dashboard, ICategory, FieldType, IDataCondition } from "@lark-base-open/js-sdk";
import { Form,  Button, Tooltip, Select, Card, Typography, Tabs, TabPane, Spin } from '@douyinfe/semi-ui';
import { IconMore, IconPlusStroked, IconIssueStroked } from '@douyinfe/semi-icons';
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
    splitArea: boolean;
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

const supportedFieldType = [2, 20, 99002, 99003, 99004]

export default function App() {
    const { Text } = Typography;
    const [initFormValue, setInitFormValue] = useState<IFormValues>();
    const [tableSource, setTableSource] = useState<ITableSource[]>([]);
    const [dataRange, setDataRange] = useState<IDataRange[]>([{ type: SourceType.ALL }]);
    const [categories, setCategories] = useState<ICategory[]>([]);
    const [autoRotateState, setAutoRotateState] = useState('off');
    const [dataSourceError, setDataSourceError] = useState(false);

    const [pageTheme, setPageTheme] = useState('light');
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
            },
            textStyle: {
                color: '#ffffff',
            },
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
            splitArea: { show: false },
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

    /** 是否配置模式或者创建模式下 */
    const isConfig = dashboard.state === DashboardState.Config || dashboard.state === DashboardState.Create;

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

    function updateTheme(theme: string, bgColor: string) {
        document.body.setAttribute('theme-mode', theme);
        setPageTheme(theme);
        setBgColor(bgColor);
        setPlotOptions(produce((draft) => {
            if(theme === 'light') { 
                draft.grid3D.axisLine.lineStyle.color = '#000';
                draft.visualMap.textStyle = { color: '#000'};
            } else {
                draft.grid3D.axisLine.lineStyle.color = '#fff';
                draft.visualMap.textStyle = { color: '#fff'}
            }
        }))
    }

    const [bgColor, setBgColor] = useState('#ffffff');
    function useTheme() {
        dashboard.onThemeChange((res) => {
            updateTheme(res.data.theme.toLocaleLowerCase(), res.data.chartBgColor);
            })

        dashboard.getTheme().then((res) => {   
            updateTheme(res.theme.toLocaleLowerCase(), res.chartBgColor);
        })     
    }
    useTheme();

    useEffect(() => {
        const offConfigChange = dashboard.onConfigChange((r) => {
            // 监听配置变化，协同修改配置
            setConfig(r.data.customConfig.config as any);
            setPlotOptions(r.data.customConfig.plotOptions as any)
        });
        return () => {
            offConfigChange();
        }
    }, []);

    function getMaxRecordTable(tableList: { tableId: string; tableName: string; }[]) {
        return new Promise<{ initTableId: string; initTableName: string; maxRecordLength: number; }>(async (resolve, reject) => {
            try {
                let maxRecordLength = -Infinity;
                let initTableId = '';
                let initTableName = '';
                for (let { tableId, tableName } of tableList) {
                    const t = await bitable.base.getTableById(tableId);
                    const recordList = await t.getRecordIdList();
                    if (recordList.length > maxRecordLength) {
                        maxRecordLength = recordList.length;
                        initTableId = tableId;
                        initTableName = tableName;
                    }
                }
                resolve({ initTableId, initTableName, maxRecordLength });
            } catch (error) {
                reject(error);
            }
        });
    }

    useEffect(() => {
        async function init() {
            const tableList = await getTableList();
            setTableSource(tableList);

            let previewConfig: IDataCondition = {} as IDataCondition
            let formInitValue: IFormValues = {} as IFormValues

            if (dashboard.state === DashboardState.Create) {
                const { initTableId, initTableName, maxRecordLength } = await getMaxRecordTable(tableList)
                const tableId = initTableId;
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
                    .filter((item, index) => supportedFieldType.includes(item.fieldType))
                    .map((item, index) => {
                        return { ...item, calcu: 'MAX' }
                    })
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
                if (_x_index_name.length === 0 || _y_index_name.length === 0 || _xyz_data.length === 0) {
                    setDataSourceError(true)
                } else {
                    setPlotOptions(produce((draft) => {
                        draft.visualMap.max = maxValue + maxValue * 0.1
                        draft.visualMap.min = minValue - minValue * 0.1
                        draft.series[0].data = _xyz_data
                        draft.xAxis3D.data = _x_index_name
                        draft.yAxis3D.data = _y_index_name
                    }))
                }


                formInitValue = {
                    ...formInitValue,
                    tableId: tableId,
                    dataRange: tableRanges[0],
                    y_axis: visibleFieldMeta[0]?.fieldId,
                    rotateSensitivity: 15,
                    autoRotate: 'off',
                    autoRotateSpeed: 10,
                    shadowSwitch: false,
                    splitArea: false,
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
                let plotOptions = customConfig.plotOptions as any
                setConfig(config)
                setAdjustableForm(config.x_axis)
                setPlotOptions(plotOptions)

                let { tableId, dataRange, groups, series } = dataConditions[0];
                const tableRanges = (await getTableRange(tableId)).filter(obj => obj.type !== 'ALL')
                setDataRange(tableRanges)
                const viewCategories = await getViewCategories(tableId)
                setCategories(viewCategories);
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
                    splitArea: plotOptions.grid3D.splitArea.show,
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
        }

        if (isConfig) {
            init()
        } else {
            async function initView() {
                const dbConfig = await dashboard.getConfig();
                const { customConfig, dataConditions } = dbConfig
                let config = customConfig.config as any
                let plotOptions = customConfig.plotOptions as any
                setConfig(config)
                setAdjustableForm(config.x_axis)
                setPlotOptions(plotOptions)
            }
            initView()
        }
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
            if (_x_index_name.length === 0 || _y_index_name.length === 0 || _xyz_data.length === 0) {
                setDataSourceError(true)
            } else {
                setPlotOptions(produce((draft) => {
                    draft.visualMap.max = maxValue + maxValue * 0.1
                    draft.visualMap.min = minValue - minValue * 0.1
                    draft.series[0].data = _xyz_data
                    draft.xAxis3D.data = _x_index_name
                    draft.yAxis3D.data = _y_index_name
                }))
            }


        }

        if (config.tableId !== '' && config.dataRange) {
            resetPlotOptions(config.tableId, (config.dataRange as any as { viewId: string }).viewId)
        }

    }, [config.tableId, config.dataRange, config.y_axis, config.x_axis])

    useEffect(() => {
        setConfig(produce((draft) => {
            draft.x_axis = adjustableForm
        }))
    }, [adjustableForm])

    const onClick = () => {
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
    };

    const tableOnChange = async (tableId) => {
        setDataSourceError(false)

        const tableRanges = (await getTableRange(tableId)).filter(obj => obj.type !== 'ALL')
        setDataRange(tableRanges)
        const categories = await getViewCategories(tableId);
        setCategories(categories);
        const x_axisList = categories
            .filter((item, index) => index !== 0)
            .filter((item, index) => supportedFieldType.includes(item.fieldType))
            .map((item, index) => {
                return { ...item, calcu: 'MAX' }
            })
        setAdjustableForm(x_axisList)
        setInitFormValue(produce((draft) => {
            draft.tableId = tableId
            draft.dataRange = tableRanges[0]
            draft.y_axis = categories[0].fieldId
        }))
        setConfig(produce((draft) => {
            draft.tableId = tableId
            draft.dataRange = tableRanges[0]
            draft.y_axis = categories[0].fieldId
            draft.x_axis = x_axisList
        }))
    };
    const dataRangeOnChange = async (dataRange) => {
        dataRange = JSON.parse(dataRange)
        const table = await bitable.base.getTableById(config.tableId);
        const defaultView = await table.getViewById(dataRange.viewId)
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
        setCategories(visibleFieldMeta)
        setInitFormValue(produce((draft) => {
            draft.dataRange = dataRange
            draft.y_axis = visibleFieldMeta[0].fieldId
        }))
        const x_axisList = visibleFieldMeta
            .filter((item, index) => item.fieldId !== dataRange.fieldId)
            .filter((item, index) => supportedFieldType.includes(item.fieldType))
            .map((item, index) => {
                return { ...item, calcu: 'MAX' }
            })
        setAdjustableForm(x_axisList)
        setConfig(produce((draft) => {
            draft.dataRange = dataRange
            draft.y_axis = visibleFieldMeta[0].fieldId
            draft.x_axis = x_axisList
        }))
    }

    const y_axisOnChange = (fieldId) => {
        setInitFormValue(produce((draft) => {
            draft.y_axis = fieldId
        }))
        setConfig(produce((draft) => {
            draft.y_axis = fieldId
        }));

    }

    const handleConfigChange = async (values: any, changedField: any) => {
        if (changedField.rotateSensitivity) {
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
        } else if (changedField.splitArea === true || changedField.splitArea === false) {
            setPlotOptions(produce((draft) => {
                draft.grid3D.splitArea.show = changedField.splitArea
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
            //case FieldType.NotSupport:
            //    iconPath = '';
            //    break;
            case FieldType.Text:
                iconPath = './text.svg'; // 设置多行文本图标路径
                break;
            case FieldType.Number:
                iconPath = './number.svg'; // 设置数字图标路径
                break;
            //case FieldType.SingleSelect:
            //    iconPath = ''; // 设置单选图标路径
            //    break;
            //case FieldType.MultiSelect:
            //    iconPath = ''; // 设置多选图标路径
            //    break;
            //case FieldType.DateTime:
            //    iconPath = './date.svg'; // 设置日期图标路径
            //    break;
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
            case 0:
                iconPath = './button.svg'; // 设置按钮图标路径
                break;
            default:
                iconPath = './warning.svg'; // 默认图标路径或处理
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
        for (let field of categories) {
            if (field.fieldId === fieldId) {
                setAdjustableForm([...adjustableForm, { fieldId: field.fieldId, fieldName: field.fieldName, fieldType: field.fieldType, calcu: 'MAX' }])
                break
            }
        }
    };
    const calcuDropdownChange = (value, index) => {
        const updatedForm = adjustableForm.map((item, idx) => {
            if (idx === index) {
                return { ...item, calcu: value };
            }
            return item;
        })
        setAdjustableForm(updatedForm);
    };
    const moveDropdownChange = (value, index) => {
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
    };
    const fieldSelectChange = (value, index) => {
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
                <IconMore style={{ display: 'flex', alignItems: 'center', color: 'var(--semi-color-text-2)' }} rotate={90} size={'small'} />
            </Button>
        );
    };
    const triggerRender2 = ({ value, ...rest }) => {
        return (

            <div style={{ width: '80px', fontWeight: 'regular', fontSize: '14px', color: 'rgb(80 132 245)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <IconPlusStroked style={{ marginRight: '2px' }} />
                添加字段
            </div>
        );
    };
    const triggerRender3 = ({ value, ...rest }) => {
        return (
            <div style={{ fontWeight: 'regular', fontSize: '14px', color: 'rgb(80 132 245)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                批量修改
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
            'top-border': dashboard.state === DashboardState.Config || dashboard.state === DashboardState.Create,
        })} style={{ overflow: 'clip', width: '100vw', height: '100vh', backgroundColor: bgColor}}>

            <div className='content'>
                {dataSourceError ? (
                    <Card
                        className={pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')}
                        style={{ maxWidth: 360 }}
                        title={'⚠️ 数据错误'}
                        headerExtraContent={
                            <Text link={{ href: 'https://semi.design/zh-CN/show/card', target: '_blank' }}>
                                帮助文档
                            </Text>
                        }
                    >
                        使用当前选择的数据表绘图失败<br />请检查数据类型是否正确或选择其他数据表
                    </Card>
                ) : (
                    plotOptions.series[0].data ? (
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
                    )
                )}
            </div>

            {dashboard.state === DashboardState.Config || dashboard.state === DashboardState.Create ? (
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--divider)' }}>
                    <Tabs type="line" className={pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')}>
                        <TabPane tab="数据配置" itemKey="0" style={{ paddingRight: '10px' }}>
                            <div
                                className='config-panel'
                                style={{
                                    '--scrollbar-thumb-bg': pageTheme === 'dark' ? ('#797B7F') : ('#BBBDBE'),
                                    '--scrollbar-thumb-hover-bg': pageTheme === 'dark' ? ('#BBBDBE') : ('#797B7F'),
                                    height: 'calc(100vh - 120px)',
                                    paddingTop: '0px',
                                    paddingBottom: '70px'
                                } as React.CSSProperties}
                            >
                                {tableSource[0] && dataRange[0] && initFormValue?.tableId ? (
                                    <Form
                                        className={pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')}
                                        layout='vertical'
                                        style={{ width: 300 }}
                                        onValueChange={handleConfigChange}
                                    >
                                        <Form.Slot label={<div style={{ fontWeight: 'initial' }}>数据源</div>}>
                                            <Select
                                                onChange={tableOnChange}
                                                dropdownClassName={`${pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                dropdownStyle={{ width: '300px' }}
                                                //field='tableId'
                                                //label='数据源'
                                                //initValue={initFormValue.tableId}
                                                value={initFormValue.tableId}
                                                style={{ width: '100%', display: 'flex' }}
                                                searchPosition='dropdown'
                                                filter
                                                clickToHide
                                            >
                                                {tableSource.map(source => renderCustomOption_tableSVG(source))}
                                            </Select>
                                        </Form.Slot>

                                        <Form.Slot label={<div style={{ fontWeight: 'initial' }}>数据范围</div>}>
                                            <Select
                                                onChange={dataRangeOnChange}
                                                dropdownClassName={`${pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                dropdownStyle={{ width: '300px' }}
                                                //field='dataRange'
                                                //label='数据范围'
                                                //initValue={JSON.stringify(initFormValue.dataRange)}
                                                value={JSON.stringify(initFormValue.dataRange)}
                                                style={{ width: '100%' }}
                                                searchPosition='dropdown'
                                                filter
                                                clickToHide
                                            >
                                                {dataRange.map(view => renderCustomOption_tableSVG_dataRange(view))}2
                                            </Select>
                                        </Form.Slot>
                                        <Form.Slot label={<div style={{ fontWeight: 'initial' }}>Y轴</div>}>
                                            <Select
                                                onChange={y_axisOnChange}
                                                dropdownClassName={`${pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                dropdownStyle={{ width: '300px' }}
                                                //field='y_axis'
                                                //label='Y轴'
                                                //initValue={initFormValue.y_axis}
                                                value={initFormValue.y_axis}
                                                style={{ width: '100%' }}
                                                searchPosition='dropdown'
                                                filter
                                                clickToHide
                                            >
                                                {categories.map(field => renderCustomOption_col(field))}
                                            </Select>
                                        </Form.Slot>
                                        <Form.Slot
                                            label={{
                                                className: 'form-label',
                                                text:
                                                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                            X轴
                                                            <Tooltip content={<div>目前支持的字段类型包括：<br />数字，公式，进度条，货币，评分</div>}><IconIssueStroked style={{ color: 'var(--semi-color-text-2)', marginLeft: '5px' }} /></Tooltip>
                                                        </div>
                                                        <div style={{ display: 'flex', alignContent: 'center' }}>
                                                            <Tooltip content={'修改当前所有字段的计算方法'} position='bottom'>
                                                                <Select
                                                                    dropdownClassName={`${pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                                    dropdownStyle={{ borderColor: 'var(--semi-color-border)' }}
                                                                    showArrow={false}
                                                                    size='small'
                                                                    borderless={true}
                                                                    style={{ width: '100%', overflowY: 'hidden', borderColor: 'var(--semi-color-border)' }}
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
                                                        </div>
                                                    </div>
                                            }}
                                        >
                                            {/* 
                                            <div style={{ width: '100%', overflowWrap: 'break-word' }}>{JSON.stringify(adjustableForm)}</div>
                                            */}
                                            <Form layout='vertical'>
                                                {adjustableForm.map((form, index) => (
                                                    <Form.Select
                                                        noLabel
                                                        labelPosition='left'
                                                        field={String(index)}
                                                        fieldStyle={{ paddingTop: '5px', paddingBottom: '5px' }}
                                                        style={{ width: '100%', overflowY: 'hidden', overflowX: 'hidden' }}
                                                        emptyContent={null}
                                                        showArrow={false}
                                                        prefix={
                                                            <Select
                                                                dropdownClassName={`${pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                                dropdownStyle={{ width: '300px', marginLeft: -10 }}
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
                                                                        dropdownClassName={`${pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                                        dropdownStyle={{ borderColor: 'var(--semi-color-border)' }}
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
                                                                    dropdownClassName={`${pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                                                    dropdownStyle={{ borderColor: 'var(--semi-color-border)' }}
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
                                            <Tooltip content={'仅支持选择数字字段'} position='bottomRight'>
                                                <Select
                                                    dropdownClassName={`${pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
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
                                                    {categories.map(field => supportedFieldType.includes(field.fieldType) ?
                                                        (renderCustomOption_col(field)) : (null))}
                                                </Select>
                                            </Tooltip>
                                        </div>


                                    </Form>
                                ) : null}
                            </div>
                        </TabPane>
                        <TabPane tab='样式配置' itemKey='1' style={{ paddingRight: '10px' }}>
                            <div
                                className='config-panel'
                                style={{
                                    '--scrollbar-thumb-bg': pageTheme === 'dark' ? ('#797B7F') : ('#BBBDBE'),
                                    '--scrollbar-thumb-hover-bg': pageTheme === 'dark' ? ('#BBBDBE') : ('#797B7F'),
                                    height: 'calc(100vh - 120px)', // 确保内容区高度不超过100vh减去按钮区高度
                                    paddingTop: '0px',
                                    paddingBottom: '70px'
                                } as React.CSSProperties}
                            >
                                {tableSource[0] && dataRange[0] && initFormValue?.tableId ? (
                                    <Form
                                        className={pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')}
                                        layout='vertical'
                                        style={{ width: 300 }}
                                        onValueChange={handleConfigChange}
                                    >
                                        {/* <Divider margin='12px' align='center'>
                                            <div style={{ fontSize: '12px', fontWeight: 'bold', opacity: 0.6 }}>基础控制</div>
                                        </Divider>*/}

                                        <Form.Select
                                            dropdownClassName={`${pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                            field='backgroundColor'
                                            label={<div style={{ fontWeight: 'initial' }}>图表背景</div>}
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
                                            label={<div style={{ fontWeight: 'initial' }}>鼠标旋转灵敏度</div>}
                                            initValue={initFormValue.rotateSensitivity}
                                            railStyle={{ backgroundColor: 'var(--semi-color-fill-1)' }}
                                            max={30}
                                            showBoundary={true}
                                            handleDot={{ size: '10px', color: 'lightblue' } as any}
                                        ></Form.Slider>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                            <div style={{ width: '50%', display: 'flex', fontSize: '14px', alignItems: 'center', gap: '10px' }}>
                                                <Form.Checkbox
                                                    field='shadowSwitch'
                                                    noLabel
                                                    initValue={initFormValue.shadowSwitch}
                                                ></Form.Checkbox>
                                                阴影
                                            </div>
                                            <div style={{ width: '50%', display: 'flex', fontSize: '14px', alignItems: 'center', gap: '10px' }}>
                                                <Form.Checkbox
                                                    field='splitArea'
                                                    noLabel
                                                    initValue={initFormValue.splitArea}
                                                ></Form.Checkbox>
                                                显示分隔区域
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                            <div style={{ width: '50%', display: 'flex', fontSize: '14px', alignItems: 'center', gap: '10px' }}>
                                                <Form.Checkbox
                                                    field='tooltipSwitch'
                                                    noLabel
                                                    initValue={initFormValue.tooltipSwitch}
                                                ></Form.Checkbox>
                                                提示框显示
                                            </div>
                                            <div style={{ width: '50%', display: 'flex', fontSize: '14px', alignItems: 'center', gap: '10px' }}>
                                                <Form.Checkbox
                                                    field='gridSwitch'
                                                    noLabel
                                                    initValue={initFormValue.gridSwitch}
                                                ></Form.Checkbox>
                                                坐标轴显示
                                            </div>
                                        </div>

                                        {/* <Divider margin='12px' align='center'>
                                            <div style={{ fontSize: '12px', fontWeight: 'bold', opacity: 0.6 }}>数据映射</div>
                                        </Divider>*/}

                                        <Form.Select
                                            dropdownClassName={`${pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                            field='visualMapColor'
                                            label={<div style={{ fontWeight: 'initial' }}>映射颜色</div>}
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
                                            <div style={{ width: '50%', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                                                <Form.Checkbox
                                                    field='visualMapShowSwitch'
                                                    noLabel
                                                    initValue={initFormValue.visualMapShowSwitch}
                                                ></Form.Checkbox>数值映射条显示
                                            </div>
                                            <div style={{ width: '50%', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                                                <Form.Checkbox
                                                    field='visualMapSwitch'
                                                    noLabel
                                                    initValue={initFormValue.visualMapSwitch}
                                                ></Form.Checkbox>数值颜色映射
                                            </div>
                                        </div>
                                        {plotOptions.visualMap.show ? (
                                            <Form.Slider
                                                field='visualMapItemHeight'
                                                label='控制条高度'
                                                railStyle={{ backgroundColor: 'var(--semi-color-fill-1)' }}
                                                initValue={initFormValue.visualMapItemHeight}
                                                min={0}
                                                max={600}
                                                showBoundary={true}
                                                tipFormatter={v => (`${v}px`)}
                                                handleDot={{ size: '10px', color: 'lightblue' } as any}
                                            ></Form.Slider>
                                        ) : (null)}

                                        {/* <Divider margin='12px' align='center'>
                                            <div style={{ fontSize: '12px', fontWeight: 'bold', opacity: 0.6 }}>自动旋转</div>
                                        </Divider>*/}

                                        <Form.Select
                                            style={{ width: '100%' }}
                                            dropdownClassName={`${pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')} form-select`}
                                            field='autoRotate'
                                            label={<div style={{ fontWeight: 'initial' }}>自动旋转</div>}
                                            initValue={initFormValue.autoRotate}
                                            clickToHide
                                        >
                                            <Select.Option value={'off'}>关闭</Select.Option>
                                            <Select.Option value={'cw'}>向右旋转</Select.Option>
                                            <Select.Option value={'ccw'}>向左旋转</Select.Option>
                                        </Form.Select>
                                        {autoRotateState !== 'off' ? (
                                            <Form.Slider
                                                field='autoRotateSpeed'
                                                label={<div style={{ fontWeight: 'initial' }}>自动旋转速度</div>}
                                                initValue={initFormValue.autoRotateSpeed}
                                                railStyle={{ backgroundColor: 'var(--semi-color-fill-1)' }}
                                                min={1}
                                                max={90}
                                                showBoundary={true}
                                                tipFormatter={v => (`${v}°/s`)}
                                                handleDot={{ size: '10px', color: 'lightblue' } as any}
                                            ></Form.Slider>
                                        ) : (null)}

                                    </Form>
                                ) : null}
                            </div>
                        </TabPane>
                    </Tabs>
                    <div
                        className={pageTheme === 'dark' ? ('semi-always-dark') : ('semi-always-light')}
                        style={{
                            display: 'flex', justifyContent: 'flex-end',
                            position: 'absolute', right: '20px', bottom: '20px', height: '50px', flexShrink: '0', // 防止高度收缩
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