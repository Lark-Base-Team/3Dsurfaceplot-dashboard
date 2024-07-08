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
    Form, Tag, Checkbox, Button,
    Select, Switch, Notification, Slider,
    Divider, InputNumber, Card, Typography
} from '@douyinfe/semi-ui';
import classnames from 'classnames'
import * as echarts from 'echarts';
import 'echarts-gl';
import ReactEcharts from 'echarts-for-react';
import produce from 'immer';


interface IFormValues {
    tableId: any;
    dataRange: any;
    rotateSensitivity: number;
    autoRotate: string;
    shadowSwitch: boolean;
    tooltipSwitch: boolean;
    gridSwitch: boolean;
    visualMapSwitch: boolean;
    visualMapShowSwitch: boolean;
    backgroundColor: string;
}

interface ITableSource {
    tableId: string;
    tableName: string;
}

export default function App() {
    const { Title } = Typography;
    const formRef = useRef(null);
    const [initFormValue, setInitFormValue] = useState<IFormValues>();
    const [tableSource, setTableSource] = useState<ITableSource[]>([]);
    const [dataRange, setDataRange] = useState<IDataRange[]>([{ type: SourceType.ALL }]);
    const [categories, setCategories] = useState<ICategory[]>([]);

    const [pageTheme, setPageTheme] = useState('LIGHT');
    const [config, setConfig] = useState({
        tableId: '',
        dataRange: { type: 'ALL' },
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
                rotateSensitivity: 15,
                autoRotateAfterStill: 1
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
                    FieldType: fieldMeta[i].type
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
                let x_index = []
                let x_index_name = []
                for (let i = 0; i <= fieldMeta.length - 1; i++) {
                    if (visibleFieldIdList.includes(fieldMeta[i].id)) {
                        visibleFieldMeta.push({
                            fieldId: fieldMeta[i].id,
                            fieldName: fieldMeta[i].name,
                            FieldType: fieldMeta[i].type
                        })
                        if (i !== 0) {
                            x_index.push(fieldMeta[i])
                            x_index_name.push(fieldMeta[i].name)
                        }
                    }
                }
                setCategories(visibleFieldMeta)

                /*
                previewConfig = {
                    tableId: tableId,
                    dataRange: tableRanges[0],
                    series: 'COUNTA',
                    groups: [
                        {
                            fieldId: visibleFieldIdList[0],
                            mode: GroupMode.ENUMERATED,//GroupMode.INTEGRATED,
                            sort: {
                                order: ORDER.ASCENDING,
                                sortType: DATA_SOURCE_SORT_TYPE.VIEW
                            }
                        }
                    ]
                }
                const data = await dashboard.getPreviewData(previewConfig)
                console.log(data)
                */
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
                //console.log(y_index)

                let xyz_data = []
                let maxValue = -Infinity; // 初始化为负无穷大
                let minValue = Infinity; // 初始化为正无穷大
                //x_index.forEach(async (x_item, x_index) => {
                //    const field = await table.getFieldById(x_item.id)
                //    y_index.forEach(async (y_item, y_index) => {
                //        const cellContent = await (await field.getCell(y_item.id)).getValue()
                //        let a = [x_index, y_index, cellContent]
                //        xyz_data.push(a)
                //    })
                //})
                Promise.all(x_index.map((x_item, x_index) => {
                    return table.getFieldById(x_item.id).then(field => {
                        return Promise.all(y_index.map((y_item, y_index) => {
                            return field.getCell(y_item.id).then(cell => {
                                return cell.getValue().then(cellContent => {
                                    let a = [x_index, y_index, cellContent];
                                    xyz_data.push(a);
                                    if (cellContent > maxValue) { maxValue = cellContent }
                                    if (cellContent < minValue) { minValue = cellContent }
                                });
                            });
                        }));
                    });
                })).then(() => {
                    //console.log(xyz_data);
                    //console.log(maxValue, minValue)
                    setPlotOptions(produce((draft) => {
                        draft.visualMap.max = maxValue + maxValue * 0.1
                        draft.visualMap.min = minValue - minValue * 0.1
                        draft.series[0].data = xyz_data
                        draft.xAxis3D.data = x_index_name
                        draft.yAxis3D.data = y_index_name
                    }))
                });


                formInitValue = {
                    ...formInitValue,
                    tableId: tableList[0]?.tableId,
                    dataRange: tableRanges[0],
                    rotateSensitivity: 15,
                    autoRotate: 'off',
                    shadowSwitch: false,
                    tooltipSwitch: false,
                    gridSwitch: true,
                    visualMapSwitch: true,
                    visualMapShowSwitch: true,
                    backgroundColor: 'transparent'
                }
                setConfig((prevConfig) => ({
                    ...prevConfig,
                    tableId: tableId,
                    dataRange: tableRanges[0]
                }))

            } else {
                const dbConfig = await dashboard.getConfig();
                const { dataConditions, customConfig } = dbConfig;
                let config = customConfig.config as any
                let plotOptions = customConfig.plotOptions as any
                setConfig(config)
                setPlotOptions(plotOptions)
                console.log(plotOptions)

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
                    rotateSensitivity: plotOptions.grid3D.viewControl.rotateSensitivity,
                    autoRotate: plotOptions.grid3D.viewControl.autoRotate === false ?
                        ('off') : (plotOptions.grid3D.viewControl.autoRotate),
                    shadowSwitch: plotOptions.grid3D.light.main.shadow,
                    tooltipSwitch: plotOptions.tooltip.show,
                    gridSwitch: plotOptions.grid3D.show,
                    visualMapSwitch: (plotOptions.visualMap.inRange.color).length === 1 ? (false) : (true),
                    visualMapShowSwitch: plotOptions.visualMap.show,
                    backgroundColor: plotOptions.grid3D.environment !== null ?
                        (plotOptions.grid3D.environment === '#000' ? ('black') : ('example')) :
                        ('transparent')
                }
            }
            setInitFormValue(formInitValue)
            console.log(categories)
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
                setConfig(config)
                setPlotOptions(plotOptions)
            }
            initView()
        }
        //console.log('init func, dashboard state: ', dashboard.state)
    }, [])


    useEffect(() => {
        async function resetPlotOptions(tableId: string, viewId: string) {
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
                        FieldType: fieldMeta[i].type
                    })
                    if (i !== 0) {
                        x_index.push(fieldMeta[i])
                        x_index_name.push(fieldMeta[i].name)
                    }
                }
            }
            //setCategories(visibleFieldMeta)
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
        }

        if (config.tableId !== '' && config.dataRange) {
            console.log('resetPlotOptions', config)
            resetPlotOptions(config.tableId, (config.dataRange as any as { viewId: string }).viewId)
        }

    }, [config.tableId, config.dataRange])

    useEffect(() => {
        console.log('plotOptions', plotOptions)
    }, [plotOptions])

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
        } else if (changedField.rotateSensitivity) {
            setPlotOptions(produce((draft) => {
                draft.grid3D.viewControl.rotateSensitivity = changedField.rotateSensitivity
            }))
        } else if (changedField.autoRotate) {
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



    }
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
                    <p>Loading...</p>
                )}
            </div>

            {dashboard.state === DashboardState.Config || dashboard.state === DashboardState.Create ? (
                <div style={{ position: 'relative' }}>
                    <div
                        className='config-panel'
                        style={{
                            overflowY: 'scroll', // 仅纵向滚动
                            overflowX: 'hidden', // 禁止横向滚动
                            paddingLeft: '15px',
                            flex: '1 1 auto', // 自动扩展并占据剩余空间
                            maxHeight: 'calc(100vh - 60px)', // 确保内容区高度不超过100vh减去按钮区高度
                        }}
                    >
                        {tableSource[0] && dataRange[0] && initFormValue?.tableId ? (
                            <Form
                                className={pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')}
                                layout='vertical'
                                style={{ width: 300 }}
                                ref={formRef}
                                onValueChange={handleConfigChange}
                            >
                                <Form.Select
                                    dropdownClassName={pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')}
                                    dropdownStyle={{ backgroundColor: 'var(--semi-color-bg-2)' }}
                                    field='tableId'
                                    label='数据源'
                                    initValue={initFormValue.tableId}
                                    style={{ width: '100%', display: 'flex' }}
                                >
                                    {tableSource.map(source => renderCustomOption_tableSVG(source))}
                                </Form.Select>
                                <Form.Select
                                    dropdownClassName={pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')}
                                    dropdownStyle={{ backgroundColor: 'var(--semi-color-bg-2)' }}
                                    field='dataRange'
                                    label='数据范围'
                                    initValue={JSON.stringify(initFormValue.dataRange)}
                                    style={{ width: '100%' }}
                                >
                                    {dataRange.map(view => renderCustomOption_tableSVG_dataRange(view))}
                                </Form.Select>

                                <Divider margin='12px' align='center' style={{ fontSize: '12px', opacity: 0.6 }}>基础控制</Divider>

                                <Form.Select
                                    dropdownClassName={pageTheme === 'DARK' ? ('semi-always-dark') : ('semi-always-light')}
                                    dropdownStyle={{ backgroundColor: 'var(--semi-color-bg-2)' }}
                                    field='backgroundColor'
                                    label='图表背景'
                                    initValue={initFormValue.backgroundColor}
                                    style={{ width: '100%' }}
                                >
                                    <Select.Option value={'transparent'}>透明</Select.Option>
                                    <Select.Option value={'black'}>黑色</Select.Option>
                                    <Select.Option value={'example'}>示例颜色</Select.Option>
                                </Form.Select>
                                <Form.Slider
                                    field='rotateSensitivity'
                                    label='鼠标旋转灵敏度'
                                    initValue={initFormValue.rotateSensitivity}
                                    max={30}
                                    showBoundary={true}
                                    handleDot={[{ size: '10px', color: 'blue' }]}
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
                                            field='autoRotate'
                                            label='自动旋转'
                                            initValue={initFormValue.autoRotate}
                                        >
                                            <Select.Option value={'off'}>关闭</Select.Option>
                                            <Select.Option value={'cw'}>向右旋转</Select.Option>
                                            <Select.Option value={'ccw'}>向左旋转</Select.Option>
                                        </Form.Select>
                                    </div>
                                </div>
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

                                <Divider margin='12px' align='center' style={{ fontSize: '12px', opacity: 0.6 }}>数据映射</Divider>

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