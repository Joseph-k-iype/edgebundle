import './assets/icons/icons.css'
import './style.css'
import './dialog.css'
import {
  GraphComponent,
  GraphViewerInputMode,
  ICommand,
  ScrollBarVisibility,
  CactusGroupLayout,
  DefaultLabelStyle,
  FoldingManager,
  FreeNodeLabelModel,
  ShapeNodeStyle,
  ShapeNodeShape,
  Rect,
  PolylineEdgeStyle,
  Arrow,
  HierarchicLayout,
  OrthogonalLayout,
  SingleCycleLayout,
  RadialLayout,
  IsolatedGroupComponentLayout,
  DiscreteEdgeLabelLayoutModel,
  CompactOrthogonalLayout,
  ExteriorLabelModel,
  ExteriorLabelModelPosition,
  NodeLabelingPolicy,
  InteriorLabelModelPosition,
  InteriorLabelModel,
  EdgeBundleDescriptor,
  EdgeBundlingStage,
  EdgeBundlingStageData
} from 'yfiles'
import { enableFolding } from './lib/FoldingSupport'
import loadGraph from './lib/loadGraph'
import './lib/yFilesLicense'
import { initializeTooltips } from './tooltips'
import { exportDiagram } from './diagram-export'
import { PrintingSupport } from './lib/PrintingSupport'
import { initializeContextMenu } from './context-menu'
import { initializeGraphSearch } from './graph-search'

async function run() {
  const graphComponent = await initializeGraphComponent()
  await buildGraphFromCsvData(graphComponent, csvData)
  await applyCactusGroupLayout(graphComponent) // Apply the layout
  // Removed enableFolding to avoid redundancy
  initializeToolbar(graphComponent)
  initializeTooltips(graphComponent)
  initializeContextMenu(graphComponent)
  initializeGraphSearch(graphComponent)
}

const csvData = [
  // Existing data
  { domain: 'Domain1', sourceSystem: 'SystemA', table: 'Table1' },
  { domain: 'Domain1', sourceSystem: 'SystemA', table: 'Table2' },
  { domain: 'Domain2', sourceSystem: 'SystemB', table: 'Table3' },
  { domain: 'Domain2', sourceSystem: 'SystemB', table: 'Table1' },

  // Additional data to simulate a more complex structure
  { domain: 'Domain3', sourceSystem: 'SystemC', table: 'Table4' },
  { domain: 'Domain3', sourceSystem: 'SystemC', table: 'Table5' },
  { domain: 'Domain4', sourceSystem: 'SystemD', table: 'Table6' },
  { domain: 'Domain4', sourceSystem: 'SystemD', table: 'Table2' },
  { domain: 'Domain5', sourceSystem: 'SystemE', table: 'Table7' },
  { domain: 'Domain5', sourceSystem: 'SystemE', table: 'Table8' },
  { domain: 'Domain1', sourceSystem: 'SystemF', table: 'Table9' },
  { domain: 'Domain2', sourceSystem: 'SystemG', table: 'Table10' },
  { domain: 'Domain3', sourceSystem: 'SystemH', table: 'Table11' },
  { domain: 'Domain4', sourceSystem: 'SystemI', table: 'Table12' },
  { domain: 'Domain5', sourceSystem: 'SystemJ', table: 'Table13' },
  { domain: 'Domain1', sourceSystem: 'SystemK', table: 'Table14' },
  { domain: 'Domain2', sourceSystem: 'SystemL', table: 'Table15' }
  // This pattern can be extended further as needed
]

function configureFolding(graphComponent) {
  // Initialize the FoldingManager with the graph of the GraphComponent
  const manager = new FoldingManager(graphComponent.graph)
  // Create a folding view and replace the graph of the GraphComponent with the view graph
  const foldingView = manager.createFoldingView()
  graphComponent.graph = foldingView.graph

  // Apply the view graph to the GraphComponent
  graphComponent.graph = foldingView.graph
}

async function initializeGraphComponent(): Promise<GraphComponent> {
  const graphComponent = new GraphComponent('.graph-component-container')
  graphComponent.horizontalScrollBarPolicy = ScrollBarVisibility.AS_NEEDED_DYNAMIC
  graphComponent.verticalScrollBarPolicy = ScrollBarVisibility.AS_NEEDED_DYNAMIC

  const mode = new GraphViewerInputMode()
  mode.navigationInputMode.allowCollapseGroup = true
  mode.navigationInputMode.allowEnterGroup = true
  mode.navigationInputMode.allowExitGroup = true
  mode.navigationInputMode.allowExpandGroup = true

  graphComponent.inputMode = mode

  // Correctly configure folding
  configureFolding(graphComponent)

  return graphComponent
}

async function buildGraphFromCsvData(graphComponent, csvData) {
  const graph = graphComponent.graph;
  graph.clear();

  // Define styles and label models as before
  const edgeStyle = new PolylineEdgeStyle({
    stroke: '2px solid black',
    targetArrow: new Arrow({ type: 'triangle', fill: 'black' })
  });
  const labelModel = new InteriorLabelModel().createParameter(InteriorLabelModelPosition.CENTER);

  const domainNodes = {};
  const sourceSystems = {};
  const tables = {};

  // Node and edge creation logic as before
  csvData.forEach(({ domain, sourceSystem, table }) => {
    if (!domainNodes[domain]) {
      const domainNode = graph.createGroupNode(null, new Rect(0, 0, 300, 300), new ShapeNodeStyle({ fill: 'lightblue', shape: ShapeNodeShape.ELLIPSE }));
      domainNodes[domain] = domainNode;
      graph.addLabel(domainNode, domain, labelModel);
    }

    const systemKey = `${domain}-${sourceSystem}`;
    if (!sourceSystems[systemKey]) {
      const systemNode = graph.createNode(domainNodes[domain], new Rect(0, 0, 150, 150), new ShapeNodeStyle({ fill: '#80ed99', shape: ShapeNodeShape.ELLIPSE }));
      sourceSystems[systemKey] = systemNode;
      graph.addLabel(systemNode, sourceSystem, labelModel);
    }

    // if (!tables[table]) {
    //   const tableNode = graph.createNode(domainNodes[domain], new Rect(0, 0, 100, 100), new ShapeNodeStyle({ fill: '#f4a259', shape: ShapeNodeShape.ELLIPSE }));
    //   tables[table] = tableNode;
    //   graph.addLabel(tableNode, table, labelModel);
    // }

    if (!tables[table]) {
      const tableNode = graph.createNode(domainNodes[domain], new Rect(0, 0, 100, 100), new ShapeNodeStyle({ fill: '#f4a259', shape: ShapeNodeShape.ELLIPSE }));
      tables[table] = tableNode;
      graph.addLabel(tableNode, table, labelModel);
      
      // Tag the node to identify it as a table node
      tableNode.tag = { type: 'table' }; // Add this line
    }

    const edge = graph.createEdge(sourceSystems[systemKey], tables[table]);
    graph.setStyle(edge, edgeStyle);
  });

  // Adjust node colors based on the inbound edges after nodes and edges have been created
  adjustNodeColorsBasedOnInboundEdges(graph);

  // Apply the layout after all nodes and edges are added
  await applyCactusGroupLayout(graphComponent);
}

// This function should be called right after the graph is completely built and just before applying the layout
function adjustNodeColorsBasedOnInboundEdges(graph) {
  // Firstly, ensure that table nodes can be distinctly identified. For this example, let's assume
  // table nodes have their `fill` property set to '#f4a259' initially and we only adjust these nodes.
  const tableNodeColor = '#f4a259';
  const nodesToUpdate = [];

  graph.nodes.forEach(node => {
    // Assuming node tags or another mechanism is used to specifically identify table nodes
    // Adjust this logic based on your specific method to identify table nodes
    if (node.tag && node.tag.type === 'table') { // Example condition, adjust as necessary
      const inboundEdges = graph.inEdgesAt(node).size;
      if (inboundEdges > 1) {
        nodesToUpdate.push(node);
      }
    }
  });

  // Now, darken the color of nodes with more than one inbound edge
  nodesToUpdate.forEach(node => {
    let nodeStyle = node.style;
    if (nodeStyle.fill === tableNodeColor) {
      let darkerColor = darkenColor(nodeStyle.fill, graph.inEdgesAt(node).size - 1);
      graph.setStyle(node, new ShapeNodeStyle({...nodeStyle, fill: darkerColor}));
    }
  });
  console.log(nodesToUpdate);
}

function darkenColor(hex, count) {
  // Darkens the hex color based on the count. The actual implementation of this function
  // depends on how much you want to darken the color. This is a basic implementation.
  let r = parseInt(hex.substr(1, 2), 16);
  let g = parseInt(hex.substr(3, 5), 16);
  let b = parseInt(hex.substr(5, 7), 16);

  // Darken the color based on the number of inbound edges
  r = Math.max(0, r - count * 10);
  g = Math.max(0, g - count * 10);
  b = Math.max(0, b - count * 10);

  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}


async function applyCactusGroupLayout(graphComponent) {
  // Directly define the base layout here to avoid the reference error
  const baseLayout = new CactusGroupLayout({
    nodeLabelingPolicy: NodeLabelingPolicy.HORIZONTAL,
    nodeLabelSpacing: 10,
    considerNodeLabels: true
  });

  // Initialize the edge bundling stage with the corrected base layout definition
  // const edgeBundling = new EdgeBundlingStage(baseLayout);

  // // Configure edge bundling parameters
  // edgeBundling.edgeBundling.bundlingStrength = 0.1; // Adjust the strength as needed

  // // Create and configure the layout data for edge bundling
  // const bundlingData = new EdgeBundlingStageData({
  //   edgeBundleDescriptors: edge => new EdgeBundleDescriptor({ bundled: true })
  // });

  // Apply the layout with edge bundling
  // try {
  //   await graphComponent.morphLayout(, '1000ms', bundlingData);
  //   console.log('Layout with edge bundling applied successfully.');
  // } catch (error) {
  //   console.error('Error applying layout with edge bundling:', error);
  // }

  await graphComponent.morphLayout(
    baseLayout,
    '1000ms'
  )
}


function initializeToolbar(graphComponent: GraphComponent) {
  document.getElementById('btn-increase-zoom')!.addEventListener('click', () => {
    ICommand.INCREASE_ZOOM.execute(null, graphComponent)
  })

  document.getElementById('btn-decrease-zoom')!.addEventListener('click', () => {
    ICommand.DECREASE_ZOOM.execute(null, graphComponent)
  })

  document.getElementById('btn-fit-graph')!.addEventListener('click', () => {
    ICommand.FIT_GRAPH_BOUNDS.execute(null, graphComponent)
  })

  document.getElementById('btn-export-svg')!.addEventListener('click', () => {
    exportDiagram(graphComponent, 'svg')
  })

  document.getElementById('btn-export-png')!.addEventListener('click', () => {
    exportDiagram(graphComponent, 'png')
  })

  document.getElementById('btn-export-pdf')!.addEventListener('click', () => {
    exportDiagram(graphComponent, 'pdf')
  })

  document.getElementById('btn-print')!.addEventListener('click', () => {
    const printingSupport = new PrintingSupport()
    printingSupport.printGraph(graphComponent.graph)
  })
}

run()
