"""Seed the database with a demo science lab scene + knowledge nodes."""
import asyncio
import json
import uuid
import pathlib
from app.core.database import init_db
from app.models.knowledge_node import KnowledgeNode
from app.models.scene import Scene, SceneObject
from app.models.model3d import Model3D


KNOWLEDGE_NODES = [
    {
        "slug": "science-lab",
        "title": "Science Laboratory",
        "summary": "A room equipped for scientific experiments and research.",
        "node_type": "place",
        "properties": {"usage": "education, research"},
        "tags": ["science", "lab", "room"],
    },
    {
        "slug": "microscope",
        "title": "Optical Microscope",
        "summary": "An instrument using visible light and lenses to magnify small objects.",
        "node_type": "object",
        "properties": {"magnification": "40x-1000x", "invention_year": 1620},
        "tags": ["optics", "biology", "instrument"],
        "wikidata_id": "Q131130",
    },
    {
        "slug": "periodic-table",
        "title": "Periodic Table of Elements",
        "summary": "A tabular arrangement of chemical elements organized by atomic number.",
        "node_type": "concept",
        "properties": {"elements": 118, "first_published": 1869},
        "tags": ["chemistry", "elements"],
        "wikidata_id": "Q10693",
    },
    {
        "slug": "beaker",
        "title": "Laboratory Beaker",
        "summary": "A cylindrical glass container used for mixing, stirring, and heating chemicals.",
        "node_type": "object",
        "properties": {"material": "borosilicate glass"},
        "tags": ["chemistry", "glassware", "lab"],
    },
    {
        "slug": "globe",
        "title": "Earth Globe",
        "summary": "A spherical model of Earth showing continents, oceans, and geography.",
        "node_type": "object",
        "properties": {"diameter_cm": 30},
        "tags": ["geography", "earth", "model"],
        "wikidata_id": "Q133792",
    },
    {
        "slug": "desktop-computer",
        "title": "Desktop Computer",
        "summary": "A personal computer designed to fit on or under a desk.",
        "node_type": "object",
        "properties": {"components": ["CPU", "GPU", "RAM", "motherboard", "storage"]},
        "tags": ["technology", "computing"],
        "wikidata_id": "Q11271",
    },
    {
        "slug": "bookshelf",
        "title": "Bookshelf",
        "summary": "A piece of furniture with shelves for storing books.",
        "node_type": "object",
        "tags": ["furniture", "books"],
    },
    {
        "slug": "animal-cell",
        "title": "Animal Cell",
        "summary": "The basic structural and functional unit of animal organisms.",
        "node_type": "concept",
        "properties": {"size_um": "10-30", "has_cell_wall": False},
        "tags": ["biology", "cell", "microscopy"],
        "wikidata_id": "Q7868",
    },
    {
        "slug": "mitochondria",
        "title": "Mitochondria",
        "summary": "Membrane-bound organelles that generate most of the cell's ATP energy.",
        "node_type": "concept",
        "properties": {"nickname": "powerhouse of the cell", "size_um": "0.5-10"},
        "tags": ["biology", "cell", "organelle", "energy"],
        "wikidata_id": "Q40614",
    },
    {
        "slug": "cell-nucleus",
        "title": "Cell Nucleus",
        "summary": "A membrane-bound organelle containing the cell's genetic material (DNA).",
        "node_type": "concept",
        "properties": {"contains": ["DNA", "chromosomes", "nucleolus"]},
        "tags": ["biology", "cell", "genetics"],
        "wikidata_id": "Q40260",
    },
    {
        "slug": "dna",
        "title": "DNA (Deoxyribonucleic Acid)",
        "summary": "A molecule carrying genetic instructions for development and functioning of all living organisms.",
        "node_type": "concept",
        "properties": {"structure": "double helix", "base_pairs": ["A-T", "G-C"]},
        "tags": ["biology", "genetics", "molecule"],
        "wikidata_id": "Q7430",
    },
    {
        "slug": "hydrogen-atom",
        "title": "Hydrogen Atom",
        "summary": "The simplest and most abundant atom in the universe, with one proton and one electron.",
        "node_type": "concept",
        "properties": {"atomic_number": 1, "mass_amu": 1.008, "symbol": "H"},
        "tags": ["chemistry", "atom", "element"],
        "wikidata_id": "Q556",
    },
]


async def seed():
    await init_db()

    # Clear existing data
    await KnowledgeNode.delete_all()
    await Scene.delete_all()
    await Model3D.delete_all()

    # --- Seed 3D model definitions from JSON ---
    data_dir = pathlib.Path(__file__).resolve().parent.parent / "data"
    models_file = data_dir / "model_definitions.json"
    if models_file.exists():
        model_defs = json.loads(models_file.read_text())
        for mdef in model_defs:
            m = Model3D(**mdef)
            await m.insert()
            print(f"  ✓ 3D model: {m.name}")
    else:
        print("  ⚠ model_definitions.json not found, skipping 3D models")

    # Insert knowledge nodes
    node_map = {}
    for kn_data in KNOWLEDGE_NODES:
        node = KnowledgeNode(**kn_data)
        await node.insert()
        node_map[node.slug] = node
        print(f"  ✓ Knowledge node: {node.title}")

    # --- Create scene hierarchy ---

    # Scene 0: Science Lab
    lab_scene = Scene(
        slug="science-lab",
        title="Science Laboratory",
        description="A fully equipped science lab. Explore by clicking on objects.",
        zoom_depth=0,
        environment={"ambient_light": 0.6, "hdri": None, "fog": None},
        camera_defaults={"position": [8, 6, 8], "target": [0, 1, 0], "fov": 50, "near": 0.1, "far": 1000},
        objects=[],
    )

    # Scene 1: Microscope View
    micro_scene = Scene(
        slug="microscope-view",
        title="Through the Microscope",
        description="Looking through the microscope lens — cells and microorganisms.",
        parent_scene_id=None,  # will set after lab_scene insert
        zoom_depth=1,
        environment={"ambient_light": 0.4, "hdri": None, "fog": {"color": "#001122", "near": 5, "far": 30}},
        camera_defaults={"position": [0, 2, 5], "target": [0, 0, 0], "fov": 40, "near": 0.01, "far": 100},
        objects=[],
    )

    # Scene 2: Animal Cell
    cell_scene = Scene(
        slug="animal-cell",
        title="Animal Cell Interior",
        description="Inside an animal cell — organelles and structures.",
        zoom_depth=2,
        environment={"ambient_light": 0.3, "hdri": None, "fog": {"color": "#112233", "near": 2, "far": 20}},
        camera_defaults={"position": [0, 3, 8], "target": [0, 0, 0], "fov": 45, "near": 0.01, "far": 50},
        objects=[],
    )

    # Scene 3: Nucleus
    nucleus_scene = Scene(
        slug="cell-nucleus",
        title="Inside the Nucleus",
        description="The nucleus — home of DNA and chromosomes.",
        zoom_depth=3,
        environment={"ambient_light": 0.3, "hdri": None, "fog": None},
        camera_defaults={"position": [0, 2, 5], "target": [0, 0, 0], "fov": 40, "near": 0.001, "far": 20},
        objects=[],
    )

    # Scene 4: DNA
    dna_scene = Scene(
        slug="dna-molecule",
        title="DNA Double Helix",
        description="The molecular structure of DNA — base pairs and atoms.",
        zoom_depth=4,
        environment={"ambient_light": 0.5, "hdri": None, "fog": None},
        camera_defaults={"position": [0, 3, 6], "target": [0, 0, 0], "fov": 35, "near": 0.001, "far": 20},
        objects=[],
    )

    # Insert scenes in order so we can get IDs
    await lab_scene.insert()
    micro_scene.parent_scene_id = str(lab_scene.id)
    await micro_scene.insert()
    cell_scene.parent_scene_id = str(micro_scene.id)
    await cell_scene.insert()
    nucleus_scene.parent_scene_id = str(cell_scene.id)
    await nucleus_scene.insert()
    dna_scene.parent_scene_id = str(nucleus_scene.id)
    await dna_scene.insert()

    # Add objects to lab scene
    lab_scene.objects = [
        SceneObject(
            id=str(uuid.uuid4()),
            knowledge_node_id=str(node_map["microscope"].id),
            label="Microscope",
            model_slug="microscope",
            transform={"position": [-2, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]},
            interaction_type="zoom_into",
            zoom_target_scene_id=str(micro_scene.id),
            highlight_color="#00ff88",
        ),
        SceneObject(
            id=str(uuid.uuid4()),
            knowledge_node_id=str(node_map["periodic-table"].id),
            label="Periodic Table",
            model_slug="periodic-table",
            transform={"position": [0, 2, -4], "rotation": [0, 0, 0], "scale": [2, 1.5, 0.1]},
            interaction_type="popup_info",
            highlight_color="#ffaa00",
        ),
        SceneObject(
            id=str(uuid.uuid4()),
            knowledge_node_id=str(node_map["beaker"].id),
            label="Beaker",
            model_slug="beaker",
            transform={"position": [1, 0.8, -1], "rotation": [0, 0, 0], "scale": [0.5, 0.5, 0.5]},
            interaction_type="popup_info",
            highlight_color="#00aaff",
        ),
        SceneObject(
            id=str(uuid.uuid4()),
            knowledge_node_id=str(node_map["globe"].id),
            label="Globe",
            model_slug="globe",
            transform={"position": [3, 1, 0], "rotation": [0, 0.3, 0], "scale": [1, 1, 1]},
            interaction_type="popup_info",
            highlight_color="#ff5500",
        ),
        SceneObject(
            id=str(uuid.uuid4()),
            knowledge_node_id=str(node_map["desktop-computer"].id),
            label="Computer",
            model_slug="computer",
            transform={"position": [3, 0.8, -3], "rotation": [0, -0.5, 0], "scale": [1, 1, 1]},
            interaction_type="popup_info",
            highlight_color="#aa00ff",
        ),
        SceneObject(
            id=str(uuid.uuid4()),
            knowledge_node_id=str(node_map["bookshelf"].id),
            label="Bookshelf",
            model_slug="bookshelf",
            transform={"position": [-4, 0, -3], "rotation": [0, 0.8, 0], "scale": [1, 2, 0.5]},
            interaction_type="popup_info",
            highlight_color="#ffff00",
        ),
    ]
    await lab_scene.save()

    # Add objects to microscope view
    micro_scene.objects = [
        SceneObject(
            id=str(uuid.uuid4()),
            knowledge_node_id=str(node_map["animal-cell"].id),
            label="Animal Cell",
            model_slug="animal-cell",
            transform={"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [2, 2, 2]},
            interaction_type="zoom_into",
            zoom_target_scene_id=str(cell_scene.id),
            highlight_color="#00ff88",
        ),
    ]
    await micro_scene.save()

    # Add objects to cell scene
    cell_scene.objects = [
        SceneObject(
            id=str(uuid.uuid4()),
            knowledge_node_id=str(node_map["cell-nucleus"].id),
            label="Nucleus",
            model_slug="nucleus",
            transform={"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1.5, 1.5, 1.5]},
            interaction_type="zoom_into",
            zoom_target_scene_id=str(nucleus_scene.id),
            highlight_color="#ff3366",
        ),
        SceneObject(
            id=str(uuid.uuid4()),
            knowledge_node_id=str(node_map["mitochondria"].id),
            label="Mitochondria",
            model_slug="mitochondria",
            transform={"position": [3, 0, 2], "rotation": [0.3, 0, 0], "scale": [0.8, 0.5, 0.5]},
            interaction_type="popup_info",
            highlight_color="#00ff00",
        ),
    ]
    await cell_scene.save()

    # Add objects to nucleus scene
    nucleus_scene.objects = [
        SceneObject(
            id=str(uuid.uuid4()),
            knowledge_node_id=str(node_map["dna"].id),
            label="DNA",
            model_slug="dna",
            transform={"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]},
            interaction_type="zoom_into",
            zoom_target_scene_id=str(dna_scene.id),
            highlight_color="#ff9900",
        ),
    ]
    await nucleus_scene.save()

    # Add objects to DNA scene
    dna_scene.objects = [
        SceneObject(
            id=str(uuid.uuid4()),
            knowledge_node_id=str(node_map["hydrogen-atom"].id),
            label="Hydrogen Atom",
            model_slug="atom",
            transform={"position": [1, 0, 0], "rotation": [0, 0, 0], "scale": [0.3, 0.3, 0.3]},
            interaction_type="popup_info",
            highlight_color="#ffffff",
        ),
    ]
    await dna_scene.save()

    print(f"\n✓ Seeded {len(KNOWLEDGE_NODES)} knowledge nodes")
    print(f"✓ Seeded 5 scenes (lab → microscope → cell → nucleus → DNA)")
    model_count = await Model3D.count()
    print(f"✓ Seeded {model_count} 3D model definitions")


if __name__ == "__main__":
    asyncio.run(seed())
