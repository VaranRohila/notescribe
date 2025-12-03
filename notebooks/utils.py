"""Utility Functions for NoteScribe Project"""
def read_and_extract_maccrobat_file(file_id):
    '''Reads a MACCROBAT2018 file given its file ID (without extension) and returns the text and entities.'''
    # Step 1: Read text
    with open(f"../data/MACCROBAT2018/{file_id}.txt", encoding="utf-8") as f:
        text = f.read()

    # Step 2: Read entities
    # and handle these lines as well with multiple entities:T15	Disease_disorder 474 481;490 503	cardiac malformations
    entities = []
    with open(f"../data/MACCROBAT2018/{file_id}.ann", encoding="utf-8") as f:
        for line in f:
            if line.startswith("T"):
                parts = line.strip().split('\t')
                eid, etype_offsets, etext = parts
                if ';' in etype_offsets:
                    # only the first one has the etype, the rest are just offsets
                    etype, first_start, first_end = etype_offsets.split(';')[0].split()
                    entities.append({
                        "type": etype,
                        "start": int(first_start),
                        "end": int(first_end)
                    })
                    # process the rest
                    for offset in etype_offsets.split(';')[1:]:
                        start, end = offset.split()
                        entities.append({
                            "type": etype,
                            "start": int(start),
                            "end": int(end)
                        })
                else:   
                    etype, start, end = etype_offsets.split()
                    entities.append({
                        "type": etype,
                        "start": int(start),
                        "end": int(end)
                    })
    return text, entities

def bio_tagging(text, entities, tokenizer):
    encoding = tokenizer(text, return_offsets_mapping=True, truncation=True, padding='max_length', max_length=512)
    offsets = encoding["offset_mapping"]
    tags = ["O"] * len(offsets)
    for ent in entities:
        for i, (start, end) in enumerate(offsets):
            if start == ent["start"]:
                tags[i] = f"B-{ent['type']}"
            elif start > ent["start"] and end <= ent["end"]:
                tags[i] = f"I-{ent['type']}"
    return encoding, tags
