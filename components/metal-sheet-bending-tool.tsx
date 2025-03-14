"use client"

import { useState, useRef, useEffect } from "react"
import {
  Settings,
  RefreshCw,
  Info,
  Trash,
  Plus,
  Scale,
  FileText,
  Layers,
  FileOutput,
  Clipboard,
  Edit3,
  CheckSquare,
  Clock,
  Package,
  TruckIcon as TruckDelivery,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"

const MetalSheetBendingTool = () => {
  // State for dimensions and piece properties
  const [unit, setUnit] = useState("mm")
  const [tabs, setTabs] = useState([
    { length: 300, angle: 90, color: "#1E88E5", foldSide: "right" },
    { length: 400, angle: 90, color: "#42A5F5", foldSide: "right" },
  ])

  // Inverter comprimento e largura conforme solicitado
  const [width, setWidth] = useState(1) // Agora é a espessura (antes era height)
  const [length, setLength] = useState(100) // Agora é a largura (antes era width)
  const [selectedPreset, setSelectedPreset] = useState("L")
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const [density, setDensity] = useState(7.85) // Densidade do aço em g/cm³

  // Estado para gerenciar chapas disponíveis
  const [availableSheets, setAvailableSheets] = useState([
    { id: 1, length: 3000, width: 1500, thickness: 1, quantity: 10 },
  ])

  // Estado para nova chapa a ser adicionada
  const [newSheet, setNewSheet] = useState({
    length: 3000,
    width: 1500,
    thickness: 1,
    quantity: 1,
  })

  // Estado para controlar a visualização ativa
  const [activeView, setActiveView] = useState("design") // "design", "sheets", "optimization", "orders", "kanban"

  // Estado para armazenar os resultados da otimização
  const [optimizationResults, setOptimizationResults] = useState(null)

  // Estado para quantidade de peças a serem produzidas
  const [quantityToProduce, setQuantityToProduce] = useState(1)

  // Estado para edição direta na visualização 3D
  const [editMode, setEditMode] = useState(false)
  const [draggedTab, setDraggedTab] = useState(null)
  const [resizingTab, setResizingTab] = useState(null)
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 })
  const [startTabValues, setStartTabValues] = useState(null)

  // Estado para sistema de OS
  const [orderNumber, setOrderNumber] = useState("")
  const [serviceOrders, setServiceOrders] = useState([])
  const [currentOrder, setCurrentOrder] = useState({
    id: "",
    description: "",
    sheets: [],
    date: new Date().toISOString().split("T")[0],
    status: "aguardando_preparo",
    pieceDesign: null,
    quantity: 1,
  })

  // Estado para retalhos
  const [scraps, setScraps] = useState([])

  // Referência para o SVG
  const svgRef = useRef(null)

  // Function to add a new tab
  const addTab = () => {
    if (tabs.length < 5) {
      setTabs([
        ...tabs,
        {
          length: 200,
          angle: 90,
          color: getRandomColor(),
          foldSide: "right",
        },
      ])
      setActiveTabIndex(tabs.length)
    }
  }

  // Function to remove a tab
  const removeTab = (index) => {
    if (tabs.length > 2) {
      const newTabs = [...tabs]
      newTabs.splice(index, 1)
      setTabs(newTabs)
      if (activeTabIndex >= newTabs.length) {
        setActiveTabIndex(newTabs.length - 1)
      }
    }
  }

  // Function to update tab properties
  const updateTab = (index, property, value) => {
    const newTabs = [...tabs]
    newTabs[index] = { ...newTabs[index], [property]: value }
    setTabs(newTabs)
  }

  // Function to generate a random color
  const getRandomColor = () => {
    const colors = ["#1E88E5", "#42A5F5", "#64B5F6", "#90CAF9", "#BBDEFB"]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Function to load presets
  const loadPreset = (preset) => {
    setSelectedPreset(preset)
    switch (preset) {
      case "Blank":
        setTabs([{ length: 500, angle: 0, color: "#1E88E5", foldSide: "right" }])
        break
      case "L":
        setTabs([
          { length: 300, angle: 90, color: "#1E88E5", foldSide: "right" },
          { length: 400, angle: 90, color: "#42A5F5", foldSide: "right" },
        ])
        break
      case "U":
        setTabs([
          { length: 200, angle: 90, color: "#1E88E5", foldSide: "right" },
          { length: 300, angle: 90, color: "#42A5F5", foldSide: "right" },
          { length: 200, angle: 90, color: "#64B5F6", foldSide: "right" },
        ])
        break
      case "Z":
        setTabs([
          { length: 200, angle: 0, color: "#1E88E5", foldSide: "right" },
          { length: 150, angle: 135, color: "#42A5F5", foldSide: "right" },
          { length: 200, angle: 0, color: "#64B5F6", foldSide: "right" },
        ])
        break
      case "Bandeja":
        setTabs([
          { length: 100, angle: 90, color: "#1E88E5", foldSide: "right" },
          { length: 300, angle: 90, color: "#42A5F5", foldSide: "right" },
          { length: 100, angle: 90, color: "#64B5F6", foldSide: "right" },
          { length: 300, angle: 90, color: "#90CAF9", foldSide: "right" },
        ])
        break
      default:
        break
    }
    setActiveTabIndex(0)
  }

  // Function to convert units
  const convertValue = (value) => {
    return unit === "cm" ? value / 10 : value
  }

  // Function to calculate total length
  const calculateTotalLength = () => {
    const totalLength = tabs.reduce((sum, tab) => sum + tab.length, 0)
    return convertValue(totalLength).toFixed(1) + " " + unit
  }

  // Function to calculate sheet weight
  const calculateWeight = () => {
    // Calcular o volume em cm³
    const totalLength = tabs.reduce((sum, tab) => sum + tab.length, 0)
    const lengthInCm = totalLength / 10 // mm para cm
    const widthInCm = length / 10 // mm para cm (invertido conforme solicitado)
    const heightInCm = width / 10 // mm para cm (invertido conforme solicitado)

    // Volume = comprimento x largura x altura (cm³)
    const volume = lengthInCm * widthInCm * heightInCm

    // Peso = volume x densidade (g)
    const weightInGrams = volume * density

    // Converter para kg se for maior que 1000g
    if (weightInGrams >= 1000) {
      return (weightInGrams / 1000).toFixed(2) + " kg"
    }

    return weightInGrams.toFixed(1) + " g"
  }

  // Função para iniciar o arrasto de uma aba
  const handleMouseDown = (event, tabIndex, type) => {
    if (!editMode) return

    event.preventDefault()
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setStartDragPos({ x, y })
    setStartTabValues({ ...tabs[tabIndex] })

    if (type === "move") {
      setDraggedTab(tabIndex)
    } else if (type === "resize") {
      setResizingTab(tabIndex)
    }

    // Definir a aba ativa quando clicada
    setActiveTabIndex(tabIndex)
  }

  // Função para processar o movimento durante o arrasto
  const handleMouseMove = (event) => {
    if (!editMode || (draggedTab === null && resizingTab === null)) return

    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const deltaX = x - startDragPos.x
    const deltaY = y - startDragPos.y

    const newTabs = [...tabs]

    if (draggedTab !== null) {
      // Calcular o novo ângulo baseado no movimento
      // Agora permitindo ângulos de -180 a 180
      const angle = startTabValues.angle - deltaY / 2
      newTabs[draggedTab] = {
        ...newTabs[draggedTab],
        angle: Math.max(-180, Math.min(180, angle)),
      }
      setTabs(newTabs)
    } else if (resizingTab !== null) {
      // Calcular o novo comprimento baseado no movimento
      const scale = 0.7 // Mesmo fator de escala usado na visualização
      const length = startTabValues.length + deltaX / scale
      newTabs[resizingTab] = {
        ...newTabs[resizingTab],
        length: Math.max(50, length), // Mínimo de 50mm
      }
      setTabs(newTabs)
    }
  }

  // Função para finalizar o arrasto
  const handleMouseUp = () => {
    setDraggedTab(null)
    setResizingTab(null)
    setStartTabValues(null)
  }

  // Adicionar e remover event listeners
  useEffect(() => {
    if (editMode) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [editMode, draggedTab, resizingTab, startDragPos, startTabValues])

  // Função para desenhar a peça
  const drawSheet = () => {
    // Increased scale factor for better visualization
    const scale = 0.7
    const viewBoxWidth = Math.max(800, tabs.reduce((sum, tab) => sum + tab.length, 0) * scale + 100)
    const viewBoxHeight = 400

    // Calculate the center point of the viewBox
    const centerX = viewBoxWidth / 2
    const centerY = viewBoxHeight / 2

    // Calculate the total width of the shape to center it
    const totalWidth = tabs.reduce((sum, tab) => {
      const angle = (tab.angle * Math.PI) / 180
      // Project the length onto the x-axis
      return sum + tab.length * Math.cos(angle) * scale
    }, 0)

    // Starting point, centered horizontally
    const startX = centerX - totalWidth / 2
    const startY = centerY

    let path = `M ${startX},${startY} `
    let currentX = startX
    let currentY = startY
    let totalAngle = 0

    tabs.forEach((tab, index) => {
      const angle = totalAngle - tab.angle
      const radians = (angle * Math.PI) / 180
      const length = tab.length * scale

      const newX = currentX + length * Math.cos(radians)
      const newY = currentY - length * Math.sin(radians)

      path += `L ${newX},${newY} `

      totalAngle = angle
      currentX = newX
      currentY = newY
    })

    const svgElements = []

    // Main path
    svgElements.push(<path key="main-path" d={path} fill="none" stroke="black" strokeWidth="2" />)

    // Draw tabs
    let currentX2 = startX
    let currentY2 = startY
    let totalAngle2 = 0

    // Armazenar as coordenadas das pontas para adicionar botões
    const endpoints = []

    tabs.forEach((tab, index) => {
      const angle = totalAngle2 - tab.angle
      const radians = (angle * Math.PI) / 180
      const tabLength = tab.length * scale

      const newX = currentX2 + tabLength * Math.cos(radians)
      const newY = currentY2 - tabLength * Math.sin(radians)

      // Armazenar as coordenadas das pontas
      if (index === 0) {
        endpoints.push({ x: currentX2, y: currentY2, position: "start" })
      }
      if (index === tabs.length - 1) {
        endpoints.push({ x: newX, y: newY, position: "end" })
      }

      const widthScaled = width * scale
      const perpRadians = radians + Math.PI / 2

      const topX1 = currentX2 + widthScaled * Math.cos(perpRadians)
      const topY1 = currentY2 - widthScaled * Math.sin(perpRadians)
      const topX2 = newX + widthScaled * Math.cos(perpRadians)
      const topY2 = newY - widthScaled * Math.sin(perpRadians)

      const points = `${currentX2},${currentY2} ${newX},${newY} ${topX2},${topY2} ${topX1},${topY1}`

      // Adicionar manipuladores de arrasto para edição direta
      const polygonProps = editMode
        ? {
            style: { cursor: "pointer" },
            onClick: () => setActiveTabIndex(index),
          }
        : {}

      svgElements.push(
        <polygon
          key={`poly-${index}`}
          points={points}
          fill={tab.color}
          fillOpacity={activeTabIndex === index && editMode ? "0.8" : "0.5"}
          stroke="black"
          strokeWidth={activeTabIndex === index && editMode ? "2.5" : "1.5"}
          {...polygonProps}
          onMouseDown={(e) => editMode && handleMouseDown(e, index, "move")}
        />,
      )

      // Measurements
      const midX = (currentX2 + newX) / 2
      const midY = (currentY2 + newY) / 2
      const labelX = midX + 5 * Math.cos(perpRadians)
      const labelY = midY - 5 * Math.sin(perpRadians)

      svgElements.push(
        <text
          key={`label-${index}`}
          x={labelX}
          y={labelY}
          fontSize="14"
          textAnchor="middle"
          fill="black"
          fontWeight="bold"
        >
          {`${convertValue(tab.length).toFixed(1)} ${unit}`}
        </text>,
      )

      // Angles
      if (index > 0) {
        svgElements.push(
          <text
            key={`angle-${index}`}
            x={currentX2}
            y={currentY2 - 20}
            fontSize="14"
            textAnchor="middle"
            fill="black"
            fontWeight="bold"
          >
            {`${tab.angle}°`}
          </text>,
        )
      }

      // Adicionar controles de edição quando no modo de edição
      if (editMode && activeTabIndex === index) {
        // Controle de ângulo (arrasto vertical)
        svgElements.push(
          <circle
            key={`angle-control-${index}`}
            cx={currentX2}
            cy={currentY2 - 40}
            r="10"
            fill="#FF5722"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: "ns-resize" }}
            onMouseDown={(e) => handleMouseDown(e, index, "move")}
          />,
        )

        // Ícone de movimento
        svgElements.push(
          <text
            key={`angle-icon-${index}`}
            x={currentX2}
            y={currentY2 - 40}
            fontSize="12"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            style={{ pointerEvents: "none" }}
          >
            ↕
          </text>,
        )

        // Controle de comprimento (arrasto horizontal)
        const resizeX = (currentX2 + newX) / 2
        const resizeY = (currentY2 + newY) / 2

        svgElements.push(
          <circle
            key={`length-control-${index}`}
            cx={resizeX}
            cy={resizeY}
            r="10"
            fill="#2196F3"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: "ew-resize" }}
            onMouseDown={(e) => handleMouseDown(e, index, "resize")}
          />,
        )

        // Ícone de redimensionamento
        svgElements.push(
          <text
            key={`resize-icon-${index}`}
            x={resizeX}
            y={resizeY}
            fontSize="12"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            style={{ pointerEvents: "none" }}
          >
            ↔
          </text>,
        )
      }

      totalAngle2 = angle
      currentX2 = newX
      currentY2 = newY
    })

    // Adicionar botões nas pontas para adicionar abas
    endpoints.forEach((point, index) => {
      const handleAddTab = () => {
        const newTabs = [...tabs]
        const newTab = {
          length: 100,
          angle: 90,
          color: getRandomColor(),
          foldSide: point.position === "start" ? "left" : "right",
        }

        if (point.position === "start") {
          newTabs.unshift(newTab)
        } else {
          newTabs.push(newTab)
        }

        setTabs(newTabs)
        setActiveTabIndex(point.position === "start" ? 0 : newTabs.length - 1)
      }

      svgElements.push(
        <circle
          key={`endpoint-${index}`}
          cx={point.x}
          cy={point.y}
          r="10"
          fill="#4CAF50"
          stroke="white"
          strokeWidth="2"
          style={{ cursor: "pointer" }}
          onClick={handleAddTab}
        />,
      )

      svgElements.push(
        <text
          key={`endpoint-text-${index}`}
          x={point.x}
          y={point.y}
          fontSize="14"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontWeight="bold"
          style={{ cursor: "pointer", pointerEvents: "none" }}
        >
          +
        </text>,
      )
    })

    // Adicionar botão de modo de edição
    svgElements.push(
      <g
        key="edit-mode-button"
        transform={`translate(${viewBoxWidth - 40}, 30)`}
        onClick={() => setEditMode(!editMode)}
        style={{ cursor: "pointer" }}
      >
        <circle r="20" fill={editMode ? "#4CAF50" : "#2196F3"} stroke="white" strokeWidth="2" />
        <text fontSize="10" textAnchor="middle" dominantBaseline="middle" fill="white" fontWeight="bold">
          {editMode ? "EDITAR" : "EDITAR"}
        </text>
      </g>,
    )

    // Adicionar legenda do modo de edição
    if (editMode) {
      svgElements.push(
        <g key="edit-legend" transform={`translate(${viewBoxWidth - 150}, 70)`}>
          <rect width="140" height="80" fill="rgba(255,255,255,0.8)" stroke="#ccc" rx="5" />

          <circle cx="15" cy="20" r="8" fill="#FF5722" />
          <text x="30" y="24" fontSize="12" fill="#333">
            Ajustar ângulo
          </text>

          <circle cx="15" cy="45" r="8" fill="#2196F3" />
          <text x="30" y="49" fontSize="12" fill="#333">
            Ajustar comprimento
          </text>

          <text x="15" y="70" fontSize="12" fill="#333" fontWeight="bold">
            Clique na aba para selecionar
          </text>
        </g>,
      )
    }

    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full border border-gray-200 rounded-lg shadow-sm bg-white"
        style={{ height: "400px" }}
      >
        {svgElements}
      </svg>
    )
  }

  // Função para desenhar o plano de corte
  const drawCutPlan = () => {
    const scale = 0.7
    const totalLength = tabs.reduce((sum, tab) => sum + tab.length, 0)
    const viewBoxWidth = Math.max(800, totalLength * scale + 200)
    const viewBoxHeight = 400

    // Calculate the center point of the viewBox
    const centerX = viewBoxWidth / 2

    // Calculate total width of all tabs
    const totalWidth = tabs.reduce((sum, tab) => sum + tab.length * scale, 0)

    // Starting point, centered horizontally
    const startX = centerX - totalWidth / 2
    const centerY = 200

    const svgElements = []

    // Title - centered
    svgElements.push(
      <text key="title" x={centerX} y="40" fontSize="18" fontWeight="bold" fill="black" textAnchor="middle">
        Plano de Corte
      </text>,
    )

    // Legend - positioned relative to the start of the drawing
    svgElements.push(
      <line
        key="legend-line"
        x1={startX}
        y1="65"
        x2={startX + 30}
        y2="65"
        stroke="red"
        strokeWidth="2"
        strokeDasharray="5,5"
      />,
    )

    svgElements.push(
      <text key="legend-text" x={startX + 35} y="70" fontSize="14" fill="black" fontWeight="bold">
        Linha de dobra
      </text>,
    )

    // Informações adicionais - peso e espessura
    svgElements.push(
      <text
        key="info-weight"
        x={startX + totalWidth - 20}
        y="65"
        fontSize="14"
        fill="black"
        fontWeight="bold"
        textAnchor="end"
      >
        Peso: {calculateWeight()} | Espessura: {convertValue(width).toFixed(1)} {unit}
      </text>,
    )

    // Flattened view
    let currentX = startX

    // Altura fixa para os retângulos no plano de corte
    const fixedHeight = 80

    tabs.forEach((tab, index) => {
      const tabWidth = tab.length * scale

      // Rectangle
      svgElements.push(
        <rect
          key={`rect-${index}`}
          x={currentX}
          y={centerY - fixedHeight / 2}
          width={tabWidth}
          height={fixedHeight}
          fill={tab.color}
          fillOpacity="0.5"
          stroke="black"
          strokeWidth="1.5"
        />,
      )

      // Measurements - comprimento
      svgElements.push(
        <text
          key={`label-${index}`}
          x={currentX + tabWidth / 2}
          y={centerY + fixedHeight / 2 + 25}
          fontSize="14"
          textAnchor="middle"
          fill="black"
          fontWeight="bold"
        >
          {`${convertValue(tab.length).toFixed(1)} ${unit}`}
        </text>,
      )

      // Fold lines
      if (index < tabs.length - 1) {
        // Verificar o lado da dobra
        const shouldDrawFold = tabs[index].foldSide === "right" || tabs[index + 1].foldSide === "left"

        if (shouldDrawFold) {
          svgElements.push(
            <line
              key={`fold-${index}`}
              x1={currentX + tabWidth}
              y1={centerY - fixedHeight / 2 - 15}
              x2={currentX + tabWidth}
              y2={centerY + fixedHeight / 2 + 15}
              stroke="red"
              strokeWidth="2"
              strokeDasharray="5,5"
            />,
          )

          // Angles
          svgElements.push(
            <text
              key={`angle-${index}`}
              x={currentX + tabWidth}
              y={centerY - fixedHeight / 2 - 25}
              fontSize="14"
              textAnchor="middle"
              fill="red"
              fontWeight="bold"
            >
              {`${tabs[index + 1].angle}°`}
            </text>,
          )

          // Indicador de lado da dobra
          const foldDirection = tabs[index].foldSide === "right" ? "→" : "←"
          svgElements.push(
            <text
              key={`fold-direction-${index}`}
              x={currentX + tabWidth}
              y={centerY - fixedHeight / 2 - 45}
              fontSize="16"
              textAnchor="middle"
              fill="blue"
              fontWeight="bold"
            >
              {foldDirection}
            </text>,
          )
        }
      }

      currentX += tabWidth
    })

    // Width indication (vertical)
    svgElements.push(
      <line
        key="width-line"
        x1={startX - 20}
        y1={centerY - fixedHeight / 2}
        x2={startX - 20}
        y2={centerY + fixedHeight / 2}
        stroke="black"
        strokeWidth="1"
      />,
    )

    // Width arrows
    svgElements.push(
      <line
        key="width-arrow-top"
        x1={startX - 20}
        y1={centerY - fixedHeight / 2}
        x2={startX - 25}
        y2={centerY - fixedHeight / 2 + 5}
        stroke="black"
        strokeWidth="1"
      />,
    )

    svgElements.push(
      <line
        key="width-arrow-top-2"
        x1={startX - 20}
        y1={centerY - fixedHeight / 2}
        x2={startX - 15}
        y2={centerY - fixedHeight / 2 + 5}
        stroke="black"
        strokeWidth="1"
      />,
    )

    svgElements.push(
      <line
        key="width-arrow-bottom"
        x1={startX - 20}
        y1={centerY + fixedHeight / 2}
        x2={startX - 25}
        y2={centerY + fixedHeight / 2 - 5}
        stroke="black"
        strokeWidth="1"
      />,
    )

    svgElements.push(
      <line
        key="width-arrow-bottom-2"
        x1={startX - 20}
        y1={centerY + fixedHeight / 2}
        x2={startX - 15}
        y2={centerY + fixedHeight / 2 - 5}
        stroke="black"
        strokeWidth="1"
      />,
    )

    // Width label
    svgElements.push(
      <text
        key="width-label"
        x={startX - 30}
        y={centerY}
        fontSize="14"
        textAnchor="end"
        dominantBaseline="middle"
        fill="black"
        fontWeight="bold"
      >
        {`${convertValue(length).toFixed(1)} ${unit}`}
      </text>,
    )

    // Total length
    svgElements.push(
      <text
        key="total-length"
        x={centerX}
        y={centerY + fixedHeight / 2 + 60}
        fontSize="16"
        textAnchor="middle"
        fill="black"
        fontWeight="bold"
      >
        {`Comprimento Total: ${calculateTotalLength()}`}
      </text>,
    )

    // Botão para gerar OS diretamente
    svgElements.push(
      <g
        key="generate-os-button"
        transform={`translate(${centerX}, ${centerY + fixedHeight / 2 + 100})`}
        onClick={() => generateOrderFromDesign()}
        style={{ cursor: "pointer" }}
      >
        <rect x="-100" y="-20" width="200" height="40" rx="5" fill="#4CAF50" stroke="white" strokeWidth="2" />
        <text fontSize="14" textAnchor="middle" dominantBaseline="middle" fill="white" fontWeight="bold">
          Gerar OS desta Peça
        </text>
      </g>,
    )

    return (
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full border border-gray-200 rounded-lg shadow-sm bg-white mt-4"
        style={{ height: "300px" }}
      >
        {svgElements}
      </svg>
    )
  }

  // Função para gerar OS diretamente do design atual
  const generateOrderFromDesign = () => {
    // Capturar o design atual
    const currentDesign = {
      tabs: [...tabs],
      width,
      length,
      unit,
      totalLength: calculateTotalLength(),
      weight: calculateWeight(),
    }

    // Gerar um número de OS automático baseado na data
    const date = new Date()
    const autoOrderNumber = `OS-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}-${serviceOrders.length + 1}`

    // Criar nova OS com o design atual
    const newOrder = {
      id: autoOrderNumber,
      description: `Peça ${selectedPreset} - ${calculateTotalLength()} x ${convertValue(length).toFixed(1)}${unit} x ${convertValue(width).toFixed(1)}${unit}`,
      sheets: [],
      date: date.toISOString().split("T")[0],
      status: "aguardando_preparo",
      pieceDesign: currentDesign,
      quantity: quantityToProduce,
    }

    // Definir a OS atual e mudar para a visualização de OS
    setCurrentOrder(newOrder)
    setActiveView("orders")

    // Exibir mensagem de sucesso
    alert(`OS ${autoOrderNumber} gerada com sucesso! Complete os detalhes e salve.`)
  }

  // Função para adicionar uma nova chapa ao estoque
  const addNewSheet = () => {
    const id = availableSheets.length > 0 ? Math.max(...availableSheets.map((sheet) => sheet.id)) + 1 : 1
    setAvailableSheets([...availableSheets, { ...newSheet, id }])
    setNewSheet({ length: 3000, width: 1500, thickness: 1, quantity: 1 })
  }

  // Função para remover uma chapa do estoque
  const removeSheet = (id) => {
    setAvailableSheets(availableSheets.filter((sheet) => sheet.id !== id))
  }

  // Função para atualizar os campos da nova chapa
  const updateNewSheet = (field, value) => {
    setNewSheet({ ...newSheet, [field]: value })
  }

  // Função para calcular a área total da peça
  const calculatePieceArea = () => {
    const totalLength = tabs.reduce((sum, tab) => sum + tab.length, 0)
    return totalLength * length
  }

  // Função para adicionar retalho ao estoque
  const addScrapToInventory = (scrap) => {
    // Adicionar apenas se tiver tamanho suficiente (mínimo 200mm x 200mm)
    if (scrap.length >= 200 && scrap.width >= 200) {
      const id = availableSheets.length > 0 ? Math.max(...availableSheets.map((sheet) => sheet.id)) + 1 : 1
      const newScrap = {
        ...scrap,
        id,
        isScrap: true,
      }
      setAvailableSheets([...availableSheets, newScrap])
      return true
    }
    return false
  }

  // Função para atualizar a ordem de serviço atual
  const updateCurrentOrder = (field, value) => {
    setCurrentOrder({
      ...currentOrder,
      [field]: value,
    })
  }

  // Função para adicionar uma chapa à ordem de serviço atual
  const addSheetToOrder = (sheet) => {
    if (!currentOrder.sheets.some((s) => s.id === sheet.id)) {
      setCurrentOrder({
        ...currentOrder,
        sheets: [...currentOrder.sheets, sheet],
      })
    }
  }

  // Função para remover uma chapa da ordem de serviço atual
  const removeSheetFromOrder = (sheetId) => {
    setCurrentOrder({
      ...currentOrder,
      sheets: currentOrder.sheets.filter((sheet) => sheet.id !== sheetId),
    })
  }

  // Função para salvar a ordem de serviço atual
  const saveServiceOrder = () => {
    if (!currentOrder.id || !currentOrder.description) {
      alert("Preencha todos os campos da OS!")
      return
    }

    const newOrder = {
      ...currentOrder,
      date: new Date().toISOString().split("T")[0],
    }

    // Verificar se já existe uma OS com esse ID
    const existingOrderIndex = serviceOrders.findIndex((order) => order.id === newOrder.id)

    if (existingOrderIndex >= 0) {
      // Atualizar OS existente
      const updatedOrders = [...serviceOrders]
      updatedOrders[existingOrderIndex] = newOrder
      setServiceOrders(updatedOrders)
    } else {
      // Adicionar nova OS
      setServiceOrders([...serviceOrders, newOrder])
    }

    // Limpar formulário
    setCurrentOrder({
      id: "",
      description: "",
      sheets: [],
      date: new Date().toISOString().split("T")[0],
      status: "aguardando_preparo",
      pieceDesign: null,
      quantity: 1,
    })

    // Mudar para a visualização Kanban
    setActiveView("kanban")
  }

  // Função para atualizar o status de uma OS
  const updateOrderStatus = (orderId, newStatus) => {
    const updatedOrders = serviceOrders.map((order) => {
      if (order.id === orderId) {
        return { ...order, status: newStatus }
      }
      return order
    })
    setServiceOrders(updatedOrders)
  }

  // Função para verificar se há estoque suficiente para uma OS
  const checkStockForOrder = (order) => {
    if (!order.pieceDesign) return true

    // Verificar se há chapas com a espessura necessária
    const requiredThickness = order.pieceDesign.width
    const compatibleSheets = availableSheets.filter((sheet) => sheet.thickness === requiredThickness)

    return compatibleSheets.length > 0
  }

  // Função para calcular o melhor aproveitamento de chapas
  const calculateOptimization = () => {
    // Área total necessária para todas as peças
    const pieceArea = calculatePieceArea()
    const totalArea = pieceArea * quantityToProduce

    // Dimensões da peça planificada
    const pieceLength = tabs.reduce((sum, tab) => sum + tab.length, 0)
    const pieceWidth = length

    // Resultados da otimização
    const results = {
      pieces: [],
      sheets: [],
      totalSheets: 0,
      totalWaste: 0,
      wastePercentage: 0,
      needsDivision: false,
      scraps: [], // Armazenar retalhos gerados
    }

    // Verificar se há chapas disponíveis com a espessura correta
    const compatibleSheets = availableSheets.filter((sheet) => sheet.thickness === width)

    if (compatibleSheets.length === 0) {
      alert("Não há chapas disponíveis com a espessura necessária!")
      return null
    }

    // Ordenar chapas por desperdício potencial (da menor para a maior)
    const sortedSheets = [...compatibleSheets].sort((a, b) => {
      // Calcular quantas peças cabem em cada chapa
      const piecesInA = Math.floor(a.length / pieceLength) * Math.floor(a.width / pieceWidth)
      const piecesInB = Math.floor(b.length / pieceLength) * Math.floor(b.width / pieceWidth)

      // Calcular área desperdiçada por peça
      const wasteA = piecesInA > 0 ? (a.length * a.width - piecesInA * pieceArea) / piecesInA : Number.POSITIVE_INFINITY
      const wasteB = piecesInB > 0 ? (b.length * b.width - piecesInB * pieceArea) / piecesInB : Number.POSITIVE_INFINITY

      // Priorizar retalhos
      if (a.isScrap && !b.isScrap) return -1
      if (!a.isScrap && b.isScrap) return 1

      // Ordenar por desperdício
      return wasteA - wasteB
    })

    // Verificar se a peça cabe em alguma chapa ou precisa ser dividida
    let needsDivision = true
    for (const sheet of sortedSheets) {
      if (
        (pieceLength <= sheet.length && pieceWidth <= sheet.width) ||
        (pieceLength <= sheet.width && pieceWidth <= sheet.length)
      ) {
        needsDivision = false
        break
      }
    }

    results.needsDivision = needsDivision

    if (needsDivision) {
      // Lógica para dividir a peça em partes menores
      // Simplificação: dividir a peça ao meio
      const dividedPieces = [
        { length: Math.ceil(pieceLength / 2), width: pieceWidth },
        { length: Math.floor(pieceLength / 2), width: pieceWidth },
      ]

      results.pieces = dividedPieces.map((piece) => ({
        ...piece,
        area: piece.length * piece.width,
        quantity: quantityToProduce,
      }))
    } else {
      results.pieces = [
        {
          length: pieceLength,
          width: pieceWidth,
          area: pieceArea,
          quantity: quantityToProduce,
        },
      ]
    }

    // Calcular quantas chapas são necessárias
    let remainingPieces = quantityToProduce
    let totalWaste = 0
    const usedSheets = []

    for (const sheet of sortedSheets) {
      if (remainingPieces <= 0) break

      // Calcular quantas peças cabem na chapa (considerando rotação)
      const piecesPerSheetHorizontal = Math.floor(sheet.length / pieceLength) * Math.floor(sheet.width / pieceWidth)
      const piecesPerSheetVertical = Math.floor(sheet.length / pieceWidth) * Math.floor(sheet.width / pieceLength)
      const piecesPerSheet = Math.max(piecesPerSheetHorizontal, piecesPerSheetVertical)
      const useVertical = piecesPerSheetVertical > piecesPerSheetHorizontal

      if (piecesPerSheet === 0) continue

      // Calcular quantas chapas deste tipo serão usadas
      const sheetsNeeded = Math.min(Math.ceil(remainingPieces / piecesPerSheet), sheet.quantity)
      const piecesFromThisSheet = Math.min(sheetsNeeded * piecesPerSheet, remainingPieces)

      remainingPieces -= piecesFromThisSheet

      // Calcular desperdício
      const sheetArea = sheet.length * sheet.width
      const usedArea = pieceArea * piecesFromThisSheet
      const waste = sheetArea * sheetsNeeded - usedArea

      totalWaste += waste

      // Calcular retalhos potenciais
      const scrapsFromSheet = []

      if (piecesPerSheet > 0) {
        // Calcular dimensões do retalho principal
        const piecesPerRow = useVertical
          ? Math.floor(sheet.width / pieceLength)
          : Math.floor(sheet.length / pieceLength)
        const piecesPerCol = useVertical ? Math.floor(sheet.length / pieceWidth) : Math.floor(sheet.width / pieceWidth)

        // Retalho horizontal (sobra no comprimento)
        if (piecesPerRow * pieceLength < (useVertical ? sheet.width : sheet.length)) {
          const scrapLength = (useVertical ? sheet.width : sheet.length) - piecesPerRow * pieceLength
          const scrapWidth = useVertical ? sheet.length : sheet.width

          if (scrapLength >= 200) {
            // Mínimo de 200mm para ser útil
            scrapsFromSheet.push({
              length: scrapLength,
              width: scrapWidth,
              thickness: sheet.thickness,
              area: scrapLength * scrapWidth,
              quantity: sheetsNeeded,
            })
          }
        }

        // Retalho vertical (sobra na largura)
        if (piecesPerCol * pieceWidth < (useVertical ? sheet.length : sheet.width)) {
          const scrapWidth = (useVertical ? sheet.length : sheet.width) - piecesPerCol * pieceWidth
          const scrapLength = useVertical ? sheet.width : sheet.length

          if (scrapWidth >= 200) {
            // Mínimo de 200mm para ser útil
            scrapsFromSheet.push({
              length: scrapLength,
              width: scrapWidth,
              thickness: sheet.thickness,
              area: scrapLength * scrapWidth,
              quantity: sheetsNeeded,
            })
          }
        }
      }

      usedSheets.push({
        id: sheet.id,
        length: sheet.length,
        width: sheet.width,
        thickness: sheet.thickness,
        quantity: sheetsNeeded,
        piecesPerSheet: piecesPerSheet,
        totalPieces: piecesFromThisSheet,
        waste: waste,
        wastePercentage: (waste / (sheetArea * sheetsNeeded)) * 100,
        scraps: scrapsFromSheet,
        useVertical: useVertical,
      })
    }

    results.sheets = usedSheets
    results.totalSheets = usedSheets.reduce((sum, sheet) => sum + sheet.quantity, 0)
    results.totalWaste = totalWaste

    // Calcular percentual de desperdício total
    const totalSheetArea = usedSheets.reduce((sum, sheet) => sum + sheet.length * sheet.width * sheet.quantity, 0)
    results.wastePercentage = (totalWaste / totalSheetArea) * 100

    // Coletar todos os retalhos
    results.scraps = usedSheets.flatMap((sheet) => sheet.scraps)

    // Verificar se todas as peças podem ser produzidas
    if (remainingPieces > 0) {
      results.insufficientSheets = true
      results.remainingPieces = remainingPieces
    }

    return results
  }

  // Função para executar a otimização
  const runOptimization = () => {
    const results = calculateOptimization()
    setOptimizationResults(results)
    if (results) {
      setActiveView("optimization")
    }
  }

  // Função para desenhar o plano de corte otimizado
  const drawOptimizedCutPlan = () => {
    if (!optimizationResults) return null

    const scale = 0.2
    const viewBoxWidth = 1000
    const viewBoxHeight = 800
    const padding = 50

    const svgElements = []

    // Título
    svgElements.push(
      <text key="title" x={viewBoxWidth / 2} y={30} fontSize="24" fontWeight="bold" fill="black" textAnchor="middle">
        Plano de Corte Otimizado
      </text>,
    )

    // Informações gerais
    svgElements.push(
      <text key="info-1" x={padding} y={70} fontSize="16" fill="black">
        Total de chapas: {optimizationResults.totalSheets}
      </text>,
    )

    svgElements.push(
      <text key="info-2" x={padding} y={95} fontSize="16" fill="black">
        Desperdício total: {optimizationResults.totalWaste.toFixed(0)} mm² (
        {optimizationResults.wastePercentage.toFixed(1)}%)
      </text>,
    )

    if (optimizationResults.needsDivision) {
      svgElements.push(
        <text key="info-3" x={padding} y={120} fontSize="16" fill="red" fontWeight="bold">
          Atenção: A peça precisou ser dividida para caber nas chapas disponíveis!
        </text>,
      )
    }

    if (optimizationResults.insufficientSheets) {
      svgElements.push(
        <text key="info-4" x={padding} y={145} fontSize="16" fill="red" fontWeight="bold">
          Atenção: Chapas insuficientes! Faltam {optimizationResults.remainingPieces} peças para produzir.
        </text>,
      )
    }

    // Legenda
    svgElements.push(
      <rect
        key="legend-piece"
        x={padding}
        y={170}
        width={20}
        height={20}
        fill="#4CAF50"
        stroke="black"
        strokeWidth="1"
      />,
    )
    svgElements.push(
      <text key="legend-piece-text" x={padding + 30} y={185} fontSize="14" fill="black">
        Peças
      </text>,
    )

    svgElements.push(
      <rect
        key="legend-waste"
        x={padding + 120}
        y={170}
        width={20}
        height={20}
        fill="#FF5252"
        stroke="black"
        strokeWidth="1"
      />,
    )
    svgElements.push(
      <text key="legend-waste-text" x={padding + 150} y={185} fontSize="14" fill="black">
        Sobras
      </text>,
    )

    svgElements.push(
      <rect
        key="legend-scrap"
        x={padding + 240}
        y={170}
        width={20}
        height={20}
        fill="#FFC107"
        stroke="black"
        strokeWidth="1"
      />,
    )
    svgElements.push(
      <text key="legend-scrap-text" x={padding + 270} y={185} fontSize="14" fill="black">
        Retalhos aproveitáveis
      </text>,
    )

    // Botão para gerar OS
    svgElements.push(
      <g
        key="generate-os-button"
        transform={`translate(${viewBoxWidth - 150}, 180)`}
        onClick={() => generateOrderFromDesign()}
        style={{ cursor: "pointer" }}
      >
        <rect x="-80" y="-20" width="160" height="40" rx="5" fill="#4CAF50" stroke="white" strokeWidth="2" />
        <text fontSize="14" textAnchor="middle" dominantBaseline="middle" fill="white" fontWeight="bold">
          Gerar OS
        </text>
      </g>,
    )

    // Desenhar as chapas utilizadas
    let yOffset = 210

    optimizationResults.sheets.forEach((sheet, sheetIndex) => {
      let sheetWidth = sheet.width * scale
      let sheetHeight = sheet.length * scale

      // Verificar se a chapa cabe na visualização
      if (sheetWidth > viewBoxWidth - 2 * padding) {
        // Ajustar escala para chapas muito grandes
        const adjustedScale = (viewBoxWidth - 2 * padding) / sheet.width
        sheetWidth = sheet.width * adjustedScale
        sheetHeight = sheet.length * adjustedScale
      }

      // Título da chapa
      svgElements.push(
        <text key={`sheet-title-${sheetIndex}`} x={padding} y={yOffset} fontSize="16" fontWeight="bold" fill="black">
          Chapa #{sheet.id} - {sheet.length} x {sheet.width} mm - {sheet.quantity} unidades
          {sheet.isScrap ? " (Retalho)" : ""}
        </text>,
      )

      yOffset += 25

      // Desenhar a chapa (fundo cinza claro)
      svgElements.push(
        <rect
          key={`sheet-${sheetIndex}`}
          x={padding}
          y={yOffset}
          width={sheetWidth}
          height={sheetHeight}
          fill="#f0f0f0"
          stroke="black"
          strokeWidth="2"
        />,
      )

      // Informações da chapa - desperdício
      svgElements.push(
        <text
          key={`sheet-waste-${sheetIndex}`}
          x={padding + sheetWidth + 20}
          y={yOffset + 25}
          fontSize="14"
          fill="black"
        >
          Desperdício: {sheet.wastePercentage.toFixed(1)}%
        </text>,
      )

      // Desenhar as peças dentro da chapa
      const pieceLength = optimizationResults.needsDivision
        ? optimizationResults.pieces[0].length
        : tabs.reduce((sum, tab) => sum + tab.length, 0)
      const pieceWidth = length

      // Determinar a melhor orientação
      const useVertical = sheet.useVertical
      const piecesPerRow = useVertical ? Math.floor(sheet.width / pieceLength) : Math.floor(sheet.length / pieceLength)
      const piecesPerCol = useVertical ? Math.floor(sheet.length / pieceWidth) : Math.floor(sheet.width / pieceWidth)

      const actualPieceWidth = (useVertical ? pieceLength : pieceWidth) * scale
      const actualPieceLength = (useVertical ? pieceWidth : pieceLength) * scale

      // Primeiro, desenhar toda a área como sobra (vermelho)
      svgElements.push(
        <rect
          key={`waste-area-${sheetIndex}`}
          x={padding}
          y={yOffset}
          width={sheetWidth}
          height={sheetHeight}
          fill="#FF5252"
          fillOpacity="0.7"
          stroke="none"
        />,
      )

      // Depois, desenhar as peças (verde) por cima
      for (let row = 0; row < piecesPerCol; row++) {
        for (let col = 0; col < piecesPerRow; col++) {
          const pieceIndex = row * piecesPerRow + col
          if (pieceIndex >= sheet.piecesPerSheet) break

          const pieceX = padding + col * actualPieceWidth
          const pieceY = yOffset + row * actualPieceLength

          svgElements.push(
            <rect
              key={`piece-${sheetIndex}-${pieceIndex}`}
              x={pieceX}
              y={pieceY}
              width={actualPieceWidth}
              height={actualPieceLength}
              fill="#4CAF50"
              fillOpacity="0.8"
              stroke="black"
              strokeWidth="1"
            />,
          )
        }
      }

      // Desenhar os retalhos aproveitáveis (amarelo)
      sheet.scraps.forEach((scrap, scrapIndex) => {
        let scrapX, scrapY, scrapWidth, scrapHeight

        if (scrapIndex === 0 && scrap.width === sheet.width) {
          // Retalho horizontal
          scrapX = padding + piecesPerRow * actualPieceWidth
          scrapY = yOffset
          scrapWidth = sheetWidth - piecesPerRow * actualPieceWidth
          scrapHeight = sheetHeight
        } else {
          // Retalho vertical
          scrapX = padding
          scrapY = yOffset + piecesPerCol * actualPieceLength
          scrapWidth = sheetWidth
          scrapHeight = sheetHeight - piecesPerCol * actualPieceLength
        }

        svgElements.push(
          <rect
            key={`scrap-${sheetIndex}-${scrapIndex}`}
            x={scrapX}
            y={scrapY}
            width={scrapWidth}
            height={scrapHeight}
            fill="#FFC107"
            fillOpacity="0.8"
            stroke="black"
            strokeWidth="1"
          />,
        )

        // Adicionar texto com dimensões do retalho
        svgElements.push(
          <text
            key={`scrap-text-${sheetIndex}-${scrapIndex}`}
            x={scrapX + scrapWidth / 2}
            y={scrapY + scrapHeight / 2}
            fontSize="12"
            textAnchor="middle"
            fill="black"
            fontWeight="bold"
          >
            {scrap.length} x {scrap.width} mm
          </text>,
        )

        // Botão para adicionar retalho ao estoque
        svgElements.push(
          <g
            key={`add-scrap-${sheetIndex}-${scrapIndex}`}
            transform={`translate(${scrapX + scrapWidth / 2}, ${scrapY + scrapHeight / 2 + 20})`}
            onClick={() => addScrapToInventory(scrap)}
            style={{ cursor: "pointer" }}
          >
            <rect x="-60" y="-10" width="120" height="20" rx="5" fill="#2196F3" stroke="white" />
            <text fontSize="10" textAnchor="middle" dominantBaseline="middle" fill="white" fontWeight="bold">
              Adicionar ao Estoque
            </text>
          </g>,
        )
      })

      yOffset += sheetHeight + 60
    })

    return (
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${Math.max(viewBoxHeight, yOffset + 50)}`}
        className="w-full border border-gray-200 rounded-lg shadow-sm bg-white mt-4"
        style={{ height: "600px", overflow: "auto" }}
      >
        {svgElements}
      </svg>
    )
  }

  // Função para exportar para HTML
  const exportToHTML = () => {
    // Criar um novo documento HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Dobra de Chapas - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          h1, h2, h3 { color: #2196F3; }
          .container { max-width: 1200px; margin: 0 auto; }
          .section { margin-bottom: 30px; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
          .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
          .info-item { background: #f5f5f5; padding: 10px; border-radius: 5px; }
          .info-label { font-size: 12px; color: #666; }
          .info-value { font-size: 16px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
          .sheet-visual { margin: 20px 0; border: 1px solid #ddd; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
          .error { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 10px; margin: 10px 0; }
          .kanban-board { display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0; }
          .kanban-column { flex: 1; min-width: 250px; background: #f5f5f5; border-radius: 5px; padding: 10px; }
          .kanban-title { font-weight: bold; padding: 10px; text-align: center; border-bottom: 1px solid #ddd; }
          .kanban-card { background: white; border-radius: 5px; padding: 10px; margin: 10px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          @media print {
            body { font-size: 12px; }
            .no-print { display: none; }
            .section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Relatório de Dobra de Chapas Metálicas</h1>
          <p>Data: ${new Date().toLocaleDateString()}</p>
          
          <div class="section">
            <h2>Informações da Peça</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Comprimento Total</div>
                <div class="info-value">${calculateTotalLength()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Largura</div>
                <div class="info-value">${convertValue(length).toFixed(1)} ${unit}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Espessura</div>
                <div class="info-value">${convertValue(width).toFixed(1)} ${unit}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Dobras</div>
                <div class="info-value">${tabs.length > 1 ? tabs.length - 1 : 0}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Peso Estimado</div>
                <div class="info-value">${calculateWeight()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Quantidade</div>
                <div class="info-value">${quantityToProduce} peças</div>
              </div>
            </div>
            
            <h3>Visualização da Peça</h3>
            ${svgRef.current ? svgRef.current.outerHTML : "<p>Visualização não disponível</p>"}
            
            <h3>Plano de Corte</h3>
            <div class="sheet-visual">
              ${drawCutPlan().outerHTML}
            </div>
            
            <h3>Detalhes das Abas</h3>
            <table>
              <thead>
                <tr>
                  <th>Aba</th>
                  <th>Comprimento</th>
                  <th>Ângulo</th>
                  <th>Lado da Dobra</th>
                </tr>
              </thead>
              <tbody>
                ${tabs
                  .map(
                    (tab, index) => `
                  <tr>
                    <td>Aba ${index + 1}</td>
                    <td>${convertValue(tab.length).toFixed(1)} ${unit}</td>
                    <td>${tab.angle}°</td>
                    <td>${tab.foldSide === "right" ? "Direita" : "Esquerda"}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          
          ${
            optimizationResults
              ? `
          <div class="section">
            <h2>Resultado da Otimização</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Total de Chapas</div>
                <div class="info-value">${optimizationResults.totalSheets}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Peças a Produzir</div>
                <div class="info-value">${quantityToProduce}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Desperdício Total</div>
                <div class="info-value">${optimizationResults.totalWaste.toFixed(0)} mm²</div>
              </div>
              <div class="info-item">
                <div class="info-label">Percentual de Desperdício</div>
                <div class="info-value">${optimizationResults.wastePercentage.toFixed(1)}%</div>
              </div>
            </div>
            
            ${
              optimizationResults.needsDivision
                ? `
              <div class="warning">
                <strong>Atenção:</strong> A peça precisou ser dividida para caber nas chapas disponíveis!
              </div>
            `
                : ""
            }
            
            ${
              optimizationResults.insufficientSheets
                ? `
              <div class="error">
                <strong>Erro:</strong> Chapas insuficientes! Faltam ${optimizationResults.remainingPieces} peças para completar a produção.
              </div>
            `
                : ""
            }
            
            <h3>Plano de Corte Otimizado</h3>
            <div class="sheet-visual">
              ${drawOptimizedCutPlan().outerHTML}
            </div>
            
            <h3>Detalhes das Chapas Utilizadas</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Dimensões</th>
                  <th>Quantidade</th>
                  <th>Desperdício</th>
                </tr>
              </thead>
              <tbody>
                ${optimizationResults.sheets
                  .map(
                    (sheet) => `
                  <tr>
                    <td>${sheet.id}</td>
                    <td>${sheet.length} x ${sheet.width} x ${sheet.thickness} mm</td>
                    <td>${sheet.quantity}</td>
                    <td>${sheet.wastePercentage.toFixed(1)}%</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
            
            ${
              optimizationResults.scraps.length > 0
                ? `
              <h3>Retalhos Aproveitáveis</h3>
              <table>
                <thead>
                  <tr>
                    <th>Dimensões</th>
                    <th>Área</th>
                    <th>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  ${optimizationResults.scraps
                    .map(
                      (scrap) => `
                    <tr>
                      <td>${scrap.length} x ${scrap.width} mm</td>
                      <td>${scrap.area} mm²</td>
                      <td>${scrap.quantity}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            `
                : ""
            }
          </div>
          `
              : ""
          }
          
          ${
            serviceOrders.length > 0
              ? `
          <div class="section">
            <h2>Ordens de Serviço</h2>
            <table>
              <thead>
                <tr>
                  <th>Número OS</th>
                  <th>Descrição</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                ${serviceOrders
                  .map(
                    (order) => `
                  <tr>
                    <td>${order.id}</td>
                    <td>${order.description}</td>
                    <td>${new Date(order.date).toLocaleDateString()}</td>
                    <td>${getStatusLabel(order.status)}</td>
                    <td>${order.quantity} peças</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
            
            <h3>Quadro Kanban</h3>
            <div class="kanban-board">
              <div class="kanban-column">
                <div class="kanban-title">Aguardando Preparo</div>
                ${
                  serviceOrders
                    .filter((o) => o.status === "aguardando_preparo")
                    .map(
                      (order) => `
                  <div class="kanban-card">
                    <strong>${order.id}</strong><br>
                    ${order.description}<br>
                    <small>${new Date(order.date).toLocaleDateString()}</small>
                  </div>
                `,
                    )
                    .join("") || '<div class="kanban-card">Nenhuma OS</div>'
                }
              </div>
              
              <div class="kanban-column">
                <div class="kanban-title">Em Produção</div>
                ${
                  serviceOrders
                    .filter((o) => o.status === "em_producao")
                    .map(
                      (order) => `
                  <div class="kanban-card">
                    <strong>${order.id}</strong><br>
                    ${order.description}<br>
                    <small>${new Date(order.date).toLocaleDateString()}</small>
                  </div>
                `,
                    )
                    .join("") || '<div class="kanban-card">Nenhuma OS</div>'
                }
              </div>
              
              <div class="kanban-column">
                <div class="kanban-title">Sem Estoque</div>
                ${
                  serviceOrders
                    .filter((o) => o.status === "sem_estoque")
                    .map(
                      (order) => `
                  <div class="kanban-card">
                    <strong>${order.id}</strong><br>
                    ${order.description}<br>
                    <small>${new Date(order.date).toLocaleDateString()}</small>
                  </div>
                `,
                    )
                    .join("") || '<div class="kanban-card">Nenhuma OS</div>'
                }
              </div>
              
              <div class="kanban-column">
                <div class="kanban-title">Finalizado</div>
                ${
                  serviceOrders
                    .filter((o) => o.status === "finalizado")
                    .map(
                      (order) => `
                  <div class="kanban-card">
                    <strong>${order.id}</strong><br>
                    ${order.description}<br>
                    <small>${new Date(order.date).toLocaleDateString()}</small>
                  </div>
                `,
                    )
                    .join("") || '<div class="kanban-card">Nenhuma OS</div>'
                }
              </div>
              
              <div class="kanban-column">
                <div class="kanban-title">A Retirar</div>
                ${
                  serviceOrders
                    .filter((o) => o.status === "a_retirar")
                    .map(
                      (order) => `
                  <div class="kanban-card">
                    <strong>${order.id}</strong><br>
                    ${order.description}<br>
                    <small>${new Date(order.date).toLocaleDateString()}</small>
                  </div>
                `,
                    )
                    .join("") || '<div class="kanban-card">Nenhuma OS</div>'
                }
              </div>
              
              <div class="kanban-column">
                <div class="kanban-title">A Entregar</div>
                ${
                  serviceOrders
                    .filter((o) => o.status === "a_entregar")
                    .map(
                      (order) => `
                  <div class="kanban-card">
                    <strong>${order.id}</strong><br>
                    ${order.description}<br>
                    <small>${new Date(order.date).toLocaleDateString()}</small>
                  </div>
                `,
                    )
                    .join("") || '<div class="kanban-card">Nenhuma OS</div>'
                }
              </div>
            </div>
          </div>
          `
              : ""
          }
          
          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Imprimir Relatório
            </button>
          </div>
        </div>
        
        <script>
          function getStatusLabel(status) {
            const labels = {
              'aguardando_preparo': 'Aguardando Preparo',
              'em_producao': 'Em Produção',
              'sem_estoque': 'Sem Estoque de Chapas',
              'finalizado': 'Finalizado',
              'a_retirar': 'A Retirar',
              'a_entregar': 'A Entregar'
            };
            return labels[status] || status;
          }
        </script>
      </body>
      </html>
    `

    // Criar um novo blob com o conteúdo HTML
    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)

    // Abrir o HTML em uma nova janela
    window.open(url, "_blank")
  }

  // Função para obter o rótulo do status
  const getStatusLabel = (status) => {
    const statusLabels = {
      aguardando_preparo: "Aguardando Preparo",
      em_producao: "Em Produção",
      sem_estoque: "Sem Estoque de Chapas",
      finalizado: "Finalizado",
      a_retirar: "A Retirar",
      a_entregar: "A Entregar",
    }
    return statusLabels[status] || status
  }

  // Função para obter a cor do status
  const getStatusColor = (status) => {
    const statusColors = {
      aguardando_preparo: "bg-blue-100 text-blue-800",
      em_producao: "bg-yellow-100 text-yellow-800",
      sem_estoque: "bg-red-100 text-red-800",
      finalizado: "bg-green-100 text-green-800",
      a_retirar: "bg-purple-100 text-purple-800",
      a_entregar: "bg-indigo-100 text-indigo-800",
    }
    return statusColors[status] || "bg-gray-100 text-gray-800"
  }

  // Função para obter o ícone do status
  const getStatusIcon = (status) => {
    switch (status) {
      case "aguardando_preparo":
        return <Clock size={16} className="mr-1" />
      case "em_producao":
        return <RefreshCw size={16} className="mr-1" />
      case "sem_estoque":
        return <AlertTriangle size={16} className="mr-1" />
      case "finalizado":
        return <CheckCircle size={16} className="mr-1" />
      case "a_retirar":
        return <Package size={16} className="mr-1" />
      case "a_entregar":
        return <TruckDelivery size={16} className="mr-1" />
      default:
        return null
    }
  }

  // Renderizar a visualização Kanban
  const renderKanbanBoard = () => {
    const columns = [
      { id: "aguardando_preparo", label: "Aguardando Preparo" },
      { id: "em_producao", label: "Em Produção" },
      { id: "sem_estoque", label: "Sem Estoque de Chapas" },
      { id: "finalizado", label: "Finalizado" },
      { id: "a_retirar", label: "A Retirar" },
      { id: "a_entregar", label: "A Entregar" },
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {columns.map((column) => (
          <div key={column.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-center mb-4 pb-2 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-800">{column.label}</h3>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {serviceOrders.filter((order) => order.status === column.id).length === 0 ? (
                <div className="text-center py-8 text-gray-400 italic">Nenhuma OS</div>
              ) : (
                serviceOrders
                  .filter((order) => order.status === column.id)
                  .map((order) => (
                    <div
                      key={order.id}
                      className="bg-gray-50 p-3 rounded-md border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-blue-700">{order.id}</div>
                        <div
                          className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)} flex items-center`}
                        >
                          {getStatusIcon(order.status)}
                          {getStatusLabel(order.status)}
                        </div>
                      </div>
                      <div className="mt-2 text-sm">{order.description}</div>
                      <div className="mt-2 text-xs text-gray-500">
                        Data: {new Date(order.date).toLocaleDateString()}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">Quantidade: {order.quantity} peças</div>

                      <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between">
                        <div className="flex space-x-1">
                          {column.id !== "a_entregar" && (
                            <button
                              onClick={() => {
                                const nextStatus = getNextStatus(column.id)
                                updateOrderStatus(order.id, nextStatus)
                              }}
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              Avançar
                            </button>
                          )}

                          {!checkStockForOrder(order) && column.id === "aguardando_preparo" && (
                            <button
                              onClick={() => updateOrderStatus(order.id, "sem_estoque")}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                              Sem Estoque
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setCurrentOrder(order)
                            setActiveView("orders")
                          }}
                          className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Função para obter o próximo status
  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      aguardando_preparo: "em_producao",
      em_producao: "finalizado",
      sem_estoque: "em_producao",
      finalizado: "a_retirar",
      a_retirar: "a_entregar",
    }
    return statusFlow[currentStatus] || currentStatus
  }

  return (
    <div className="w-full mx-auto bg-gradient-to-b from-blue-50 to-white p-6 rounded-xl shadow-md">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-800">Ferramenta de Dobra e Corte de Chapas Metálicas</h2>
        <div className="flex gap-2">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm"
            onClick={exportToHTML}
          >
            <FileOutput size={16} />
            <span>Exportar HTML</span>
          </button>
        </div>
      </div>

      {/* Navegação entre visualizações */}
      <div className="mb-6 flex border-b border-gray-200">
        <button
          className={`py-2 px-4 font-medium ${activeView === "design" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveView("design")}
        >
          <Settings size={16} className="inline mr-2" />
          Design da Peça
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeView === "sheets" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveView("sheets")}
        >
          <Layers size={16} className="inline mr-2" />
          Chapas Disponíveis
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeView === "orders" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveView("orders")}
        >
          <Clipboard size={16} className="inline mr-2" />
          Ordens de Serviço
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeView === "kanban" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveView("kanban")}
        >
          <CheckSquare size={16} className="inline mr-2" />
          Kanban
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeView === "optimization" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => optimizationResults && setActiveView("optimization")}
          disabled={!optimizationResults}
        >
          <FileText size={16} className="inline mr-2" />
          Resultado da Otimização
        </button>
      </div>

      {/* Visualização de Design da Peça */}
      {activeView === "design" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column - Configuration */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <Settings size={18} className="text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Configurações Gerais</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Unidade</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="mm">Milímetros (mm)</option>
                    <option value="cm">Centímetros (cm)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Espessura</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="ml-2 text-gray-600">{unit}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Largura</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="ml-2 text-gray-600">{unit}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">A largura será exibida no plano de corte</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Densidade do Aço</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={density}
                    onChange={(e) => setDensity(Number(e.target.value))}
                    step="0.01"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled
                  />
                  <span className="ml-2 text-gray-600">g/cm³</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Valor padrão para aço: 7.85 g/cm³</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Quantidade a Produzir</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={quantityToProduce}
                    onChange={(e) => setQuantityToProduce(Number(e.target.value))}
                    min="1"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="ml-2 text-gray-600">peças</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Presets de Formas</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    onClick={() => loadPreset("Blank")}
                    className={`py-2 px-3 rounded-md text-sm font-medium ${selectedPreset === "Blank" ? "bg-blue-100 text-blue-700 border-2 border-blue-400" : "bg-gray-100 text-gray-700 border border-gray-300"}`}
                  >
                    Blank
                  </button>
                  <button
                    onClick={() => loadPreset("L")}
                    className={`py-2 px-3 rounded-md text-sm font-medium ${selectedPreset === "L" ? "bg-blue-100 text-blue-700 border-2 border-blue-400" : "bg-gray-100 text-gray-700 border border-gray-300"}`}
                  >
                    Forma L
                  </button>
                  <button
                    onClick={() => loadPreset("U")}
                    className={`py-2 px-3 rounded-md text-sm font-medium ${selectedPreset === "U" ? "bg-blue-100 text-blue-700 border-2 border-blue-400" : "bg-gray-100 text-gray-700 border border-gray-300"}`}
                  >
                    Forma U
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => loadPreset("Z")}
                    className={`py-2 px-3 rounded-md text-sm font-medium ${selectedPreset === "Z" ? "bg-blue-100 text-blue-700 border-2 border-blue-400" : "bg-gray-100 text-gray-700 border border-gray-300"}`}
                  >
                    Forma Z
                  </button>
                  <button
                    onClick={() => loadPreset("Bandeja")}
                    className={`py-2 px-3 rounded-md text-sm font-medium ${selectedPreset === "Bandeja" ? "bg-blue-100 text-blue-700 border-2 border-blue-400" : "bg-gray-100 text-gray-700 border border-gray-300"}`}
                  >
                    Bandeja
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={runOptimization}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium"
                >
                  Calcular Melhor Aproveitamento
                </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <Info size={18} className="text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Informações da Peça</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm text-gray-500">Comprimento Total</div>
                  <div className="text-lg font-semibold text-gray-800">{calculateTotalLength()}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm text-gray-500">Largura</div>
                  <div className="text-lg font-semibold text-gray-800">
                    {convertValue(length).toFixed(1)} {unit}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm text-gray-500">Espessura</div>
                  <div className="text-lg font-semibold text-gray-800">
                    {convertValue(width).toFixed(1)} {unit}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm text-gray-500">Dobras</div>
                  <div className="text-lg font-semibold text-gray-800">{tabs.length > 1 ? tabs.length - 1 : 0}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md col-span-2">
                  <div className="text-sm text-gray-500 flex items-center">
                    <Scale size={16} className="mr-1" />
                    Peso Estimado
                  </div>
                  <div className="text-lg font-semibold text-gray-800">{calculateWeight()}</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <RefreshCw size={18} className="text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-800">Abas</h3>
                </div>
                <button
                  onClick={addTab}
                  disabled={tabs.length >= 5}
                  className={`px-3 py-1.5 text-white text-sm rounded-md ${tabs.length >= 5 ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"}`}
                >
                  + Adicionar Aba
                </button>
              </div>

              <div className="flex mb-4 overflow-x-auto pb-2">
                {tabs.map((tab, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTabIndex(index)}
                    className={`px-3 py-1.5 mr-2 rounded-md text-sm font-medium whitespace-nowrap ${
                      activeTabIndex === index
                        ? "bg-blue-100 text-blue-700 border-2 border-blue-400"
                        : "bg-gray-100 text-gray-700 border border-gray-300"
                    }`}
                  >
                    Aba {index + 1}
                  </button>
                ))}
              </div>

              {tabs.map((tab, index) => (
                <div key={index} className={`${activeTabIndex === index ? "block" : "hidden"}`}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-700">Configuração da Aba {index + 1}</h4>
                    {tabs.length > 1 && (
                      <button
                        onClick={() => removeTab(index)}
                        className="bg-red-500 hover:bg-red-600 text-white h-7 text-xs px-2 py-0 rounded-md"
                        disabled={tabs.length <= 1}
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Comprimento</label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={tab.length}
                          onChange={(e) => updateTab(index, "length", Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="ml-2 text-gray-600">{unit}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">
                        Ângulo de Dobra: {tab.angle}°
                      </label>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={tab.angle}
                        onChange={(e) => updateTab(index, "angle", Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>-180°</span>
                        <span>0°</span>
                        <span>180°</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Lado da Dobra</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateTab(index, "foldSide", "left")}
                          className={`flex-1 flex items-center justify-center gap-1 p-2 border rounded-md ${
                            tab.foldSide === "left"
                              ? "bg-blue-100 text-blue-700 border-blue-400"
                              : "bg-gray-100 text-gray-700 border-gray-300"
                          }`}
                        >
                          <span>Esquerda</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTab(index, "foldSide", "right")}
                          className={`flex-1 flex items-center justify-center gap-1 p-2 border rounded-md ${
                            tab.foldSide === "right"
                              ? "bg-blue-100 text-blue-700 border-blue-400"
                              : "bg-gray-100 text-gray-700 border-gray-300"
                          }`}
                        >
                          <span>Direita</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Selecione o lado onde a próxima dobra será aplicada</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column - Visualization */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">Visualização 3D</h3>
                <div className="flex items-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${editMode ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}
                  >
                    {editMode ? "Modo de Edição Ativo" : "Clique no botão EDITAR para editar diretamente"}
                  </span>
                </div>
              </div>
              {drawSheet()}
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium mb-4 text-gray-800">Plano de Corte</h3>
              {drawCutPlan()}
            </div>
          </div>
        </div>
      )}

      {/* Visualização de Chapas Disponíveis */}
      {activeView === "sheets" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <Plus size={18} className="text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Adicionar Nova Chapa</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Comprimento</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={newSheet.length}
                      onChange={(e) => updateNewSheet("length", Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="ml-2 text-gray-600">mm</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Largura</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={newSheet.width}
                      onChange={(e) => updateNewSheet("width", Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="ml-2 text-gray-600">mm</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Espessura</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={newSheet.thickness}
                      onChange={(e) => updateNewSheet("thickness", Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="ml-2 text-gray-600">mm</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Quantidade</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={newSheet.quantity}
                      onChange={(e) => updateNewSheet("quantity", Number(e.target.value))}
                      min="1"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="ml-2 text-gray-600">unidades</span>
                  </div>
                </div>

                <button
                  onClick={addNewSheet}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium"
                >
                  Adicionar Chapa
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <Layers size={18} className="text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Chapas Disponíveis</h3>
              </div>

              {availableSheets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma chapa cadastrada. Adicione chapas para calcular o melhor aproveitamento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          ID
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Comprimento
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Largura
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Espessura
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Quantidade
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Área
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Tipo
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {availableSheets.map((sheet) => (
                        <tr key={sheet.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sheet.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sheet.length} mm</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sheet.width} mm</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sheet.thickness} mm</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sheet.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(sheet.length * sheet.width).toLocaleString()} mm²
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sheet.isScrap ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                Retalho
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Chapa</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => addSheetToOrder(sheet)}
                              className="text-blue-600 hover:text-blue-700 mr-3"
                              title="Adicionar à OS"
                            >
                              <Clipboard size={16} className="inline" />
                            </button>
                            <button
                              onClick={() => removeSheet(sheet.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Remover do estoque"
                            >
                              <Trash size={16} className="inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={runOptimization}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium"
                >
                  Calcular Melhor Aproveitamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visualização de Ordens de Serviço */}
      {activeView === "orders" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <Clipboard size={18} className="text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Nova Ordem de Serviço</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Número da OS</label>
                  <input
                    type="text"
                    value={currentOrder.id}
                    onChange={(e) => updateCurrentOrder("id", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: OS-2023-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Descrição</label>
                  <textarea
                    value={currentOrder.description}
                    onChange={(e) => updateCurrentOrder("description", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Descrição do serviço a ser realizado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Data</label>
                  <input
                    type="date"
                    value={currentOrder.date}
                    onChange={(e) => updateCurrentOrder("date", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Quantidade</label>
                  <input
                    type="number"
                    value={currentOrder.quantity}
                    onChange={(e) => updateCurrentOrder("quantity", Number(e.target.value))}
                    min="1"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Status</label>
                  <select
                    value={currentOrder.status}
                    onChange={(e) => updateCurrentOrder("status", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="aguardando_preparo">Aguardando Preparo</option>
                    <option value="em_producao">Em Produção</option>
                    <option value="sem_estoque">Sem Estoque de Chapas</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="a_retirar">A Retirar</option>
                    <option value="a_entregar">A Entregar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Chapas Selecionadas</label>
                  {currentOrder.sheets.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-md">
                      Nenhuma chapa selecionada. Adicione chapas na aba "Chapas Disponíveis".
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Dimensões</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentOrder.sheets.map((sheet) => (
                            <tr key={sheet.id}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{sheet.id}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {sheet.length} x {sheet.width} x {sheet.thickness} mm
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-right text-sm">
                                <button
                                  onClick={() => removeSheetFromOrder(sheet.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <button
                  onClick={saveServiceOrder}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium"
                >
                  Salvar Ordem de Serviço
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <FileText size={18} className="text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Ordens de Serviço</h3>
              </div>

              {serviceOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma ordem de serviço cadastrada. Crie uma nova OS para começar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Número OS
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Descrição
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Data
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Quantidade
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {serviceOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{order.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.quantity} peças</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => setCurrentOrder(order)}
                              className="text-blue-600 hover:text-blue-700 mr-3"
                            >
                              <Edit3 size={16} className="inline" />
                            </button>
                            <button
                              onClick={() => setServiceOrders(serviceOrders.filter((o) => o.id !== order.id))}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash size={16} className="inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visualização Kanban */}
      {activeView === "kanban" && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <CheckSquare size={18} className="text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-800">Quadro Kanban de Ordens de Serviço</h3>
            </div>

            {serviceOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma ordem de serviço cadastrada. Crie uma nova OS para começar.
              </div>
            ) : (
              renderKanbanBoard()
            )}
          </div>
        </div>
      )}

      {/* Visualização de Resultados da Otimização */}
      {activeView === "optimization" && optimizationResults && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <FileText size={18} className="text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-800">Resultado da Otimização</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-500">Total de Chapas</div>
                <div className="text-2xl font-bold text-gray-800">{optimizationResults.totalSheets}</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-500">Peças a Produzir</div>
                <div className="text-2xl font-bold text-gray-800">{quantityToProduce}</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-500">Desperdício Total</div>
                <div className="text-2xl font-bold text-gray-800">{optimizationResults.totalWaste.toFixed(0)} mm²</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-500">Percentual de Desperdício</div>
                <div className="text-2xl font-bold text-gray-800">
                  {optimizationResults.wastePercentage.toFixed(1)}%
                </div>
              </div>
            </div>

            {optimizationResults.needsDivision && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Atenção: A peça precisou ser dividida para caber nas chapas disponíveis!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {optimizationResults.insufficientSheets && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      Erro: Chapas insuficientes! Faltam {optimizationResults.remainingPieces} peças para completar a
                      produção.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {drawOptimizedCutPlan()}

            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-800 mb-4">Detalhes das Chapas Utilizadas</h4>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        ID
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Dimensões
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Quantidade
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Desperdício
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {optimizationResults.sheets.map((sheet) => (
                      <tr key={sheet.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sheet.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sheet.length} x {sheet.width} x {sheet.thickness} mm
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sheet.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={sheet.wastePercentage > 30 ? "text-red-600 font-bold" : "text-orange-500"}>
                            {sheet.wastePercentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {optimizationResults.scraps && optimizationResults.scraps.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Retalhos Aproveitáveis</h4>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Dimensões
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Área
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Quantidade
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Ação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {optimizationResults.scraps.map((scrap, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {scrap.length} x {scrap.width} mm
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {scrap.area.toLocaleString()} mm²
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{scrap.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => addScrapToInventory(scrap)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs"
                            >
                              Adicionar ao Estoque
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MetalSheetBendingTool

